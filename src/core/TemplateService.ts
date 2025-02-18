import { App, TFile, TFolder } from "obsidian";
import {
	Template,
	TemplateInstance,
	TemplateNode,
	TemplateGroup,
} from "./Template";
import { v4 as uuidv4 } from "uuid";

export class TemplateService {
	private app: App;
	private templates: Map<string, Template>;
	private instances: Map<string, TemplateInstance>;
	private groups: Map<string, TemplateGroup>;
	private migrationScripts: Map<
		string,
		(template: Template) => Promise<Template>
	>;

	constructor(app: App) {
		this.app = app;
		this.templates = new Map();
		this.instances = new Map();
		this.groups = new Map();
		this.migrationScripts = new Map();
		this.registerMigrationScripts();
	}

	private registerMigrationScripts() {
		// Register migration scripts for each version upgrade
		this.migrationScripts.set(
			"1.0.0-to-1.1.0",
			async (template: Template) => {
				// Example migration from 1.0.0 to 1.1.0
				return {
					...template,
					metadata: {
						...template.metadata,
						version: "1.1.0",
						migrationHistory: [
							...(template.metadata.migrationHistory || []),
							{
								fromVersion: "1.0.0",
								toVersion: "1.1.0",
								timestamp: new Date().toISOString(),
							},
						],
					},
				};
			}
		);
	}

	private async migrateTemplate(template: Template): Promise<Template> {
		const currentVersion = template.metadata.version;
		const latestVersion = "1.1.0"; // This should be managed centrally

		if (currentVersion === latestVersion) {
			return template;
		}

		// Find and apply all necessary migrations in sequence
		let migratedTemplate = { ...template };
		const migrations = this.getMigrationPath(currentVersion, latestVersion);

		for (const migration of migrations) {
			const script = this.migrationScripts.get(migration);
			if (script) {
				migratedTemplate = await script(migratedTemplate);
			}
		}

		return migratedTemplate;
	}

	private getMigrationPath(fromVersion: string, toVersion: string): string[] {
		// This is a simplified version - in reality, you'd want to calculate
		// the correct path through version graph
		return [`${fromVersion}-to-${toVersion}`];
	}

	// Template CRUD operations
	async createTemplate(
		name: string,
		structure: TemplateNode[],
		parentId?: string
	): Promise<Template> {
		const template: Template = {
			id: uuidv4(),
			name,
			structure,
			instances: [],
			metadata: {
				version: "1.0.0",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				status: "active",
			},
			inheritance: parentId
				? {
						parentId,
						overrideStrategy: "merge",
				  }
				: undefined,
		};

		this.templates.set(template.id, template);
		await this.saveTemplates();
		return template;
	}

	async updateTemplate(
		id: string,
		updates: Partial<Template>
	): Promise<Template> {
		const template = this.templates.get(id);
		if (!template) {
			throw new Error(`Template not found: ${id}`);
		}

		const updatedTemplate = {
			...template,
			...updates,
			metadata: {
				...template.metadata,
				...updates.metadata,
				updatedAt: new Date().toISOString(),
			},
		};

		this.templates.set(id, updatedTemplate);
		await this.saveTemplates();

		if (updates.structure) {
			await this.updateInstancesForTemplate(id, updates.structure);
		}

		return updatedTemplate;
	}

	// Instance management
	async createInstance(
		templateId: string,
		file: TFile
	): Promise<TemplateInstance> {
		const template = this.templates.get(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}

		const instance: TemplateInstance = {
			id: uuidv4(),
			templateId,
			file,
			structure: JSON.parse(JSON.stringify(template.structure)), // Deep clone
			metadata: {
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				version: template.metadata.version,
				customizations: {
					addedNodes: [],
					removedNodeIds: [],
					modifiedNodes: {},
				},
			},
		};

		this.instances.set(instance.id, instance);

		template.instances.push(instance);
		await this.saveTemplates();
		await this.saveInstances();

		return instance;
	}

	async updateInstance(
		id: string,
		updates: Partial<TemplateInstance>
	): Promise<TemplateInstance> {
		const instance = this.instances.get(id);
		if (!instance) {
			throw new Error(`Instance not found: ${id}`);
		}

		const updatedInstance = {
			...instance,
			...updates,
			metadata: {
				...instance.metadata,
				...updates.metadata,
				updatedAt: new Date().toISOString(),
			},
		};

		this.instances.set(id, updatedInstance);

		const template = this.templates.get(instance.templateId);
		if (template) {
			const instanceIndex = template.instances.findIndex(
				(i) => i.id === id
			);
			if (instanceIndex !== -1) {
				template.instances[instanceIndex] = updatedInstance;
				await this.saveTemplates();
			}
		}

		await this.saveInstances();
		return updatedInstance;
	}

	async deleteInstance(id: string): Promise<void> {
		const instance = this.instances.get(id);
		if (!instance) {
			throw new Error(`Instance not found: ${id}`);
		}

		const template = this.templates.get(instance.templateId);
		if (template) {
			template.instances = template.instances.filter((i) => i.id !== id);
			await this.saveTemplates();
		}

		this.instances.delete(id);
		await this.saveInstances();
	}

	private async updateInstancesForTemplate(
		templateId: string,
		newStructure: TemplateNode[]
	): Promise<void> {
		const template = this.templates.get(templateId);
		if (!template) return;

		for (const instance of template.instances) {
			const updatedInstance = await this.mergeTemplateChanges(
				instance,
				newStructure
			);
			await this.updateInstance(instance.id, updatedInstance);
		}
	}

	private async mergeTemplateChanges(
		instance: TemplateInstance,
		newStructure: TemplateNode[]
	): Promise<TemplateInstance> {
		const existingNodes = new Map<string, TemplateNode>();
		const flattenNodes = (nodes: TemplateNode[]) => {
			nodes.forEach((node) => {
				existingNodes.set(node.id, node);
				flattenNodes(node.children);
			});
		};
		flattenNodes(instance.structure);

		const customizedStructure = newStructure.map((node) => {
			const existingNode = existingNodes.get(node.id);
			if (existingNode) {
				return {
					...node,
					content: existingNode.content,
					children: node.children.map((child) => ({
						...child,
						content:
							existingNodes.get(child.id)?.content ||
							child.content,
					})),
				};
			}
			return node;
		});

		return {
			...instance,
			structure: customizedStructure,
			metadata: {
				...instance.metadata,
				updatedAt: new Date().toISOString(),
			},
		};
	}

	// Group management
	async createGroup(
		name: string,
		templates: Template[] = []
	): Promise<TemplateGroup> {
		const group: TemplateGroup = {
			id: uuidv4(),
			name,
			templates,
			metadata: {
				description: "",
				icon: "folder",
				color: "#000000",
			},
		};

		this.groups.set(group.id, group);
		await this.saveGroups();
		return group;
	}

	// File operations
	async applyTemplateToFile(templateId: string, file: TFile): Promise<void> {
		const template = this.templates.get(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}

		const instance = await this.createInstance(templateId, file);
		const content = this.generateFileContent(instance.structure);
		await this.app.vault.modify(file, content);
	}

	private generateFileContent(structure: TemplateNode[]): string {
		return structure.map((node) => this.renderNode(node)).join("\n\n");
	}

	private renderNode(node: TemplateNode, level = 0): string {
		const indent = "  ".repeat(level);
		switch (node.type) {
			case "heading":
				return `${indent}${"#".repeat(node.level || 1)} ${
					node.content
				}`;
			case "paragraph":
				return `${indent}${node.content}`;
			case "codeblock":
				return `${indent}\`\`\`\n${node.content}\n${indent}\`\`\``;
			case "list":
				return `${indent}- ${node.content}`;
			case "callout":
				return `${indent}> ${node.content}`;
			default:
				return node.content;
		}
	}

	// Persistence
	private async saveTemplates(): Promise<void> {
		const data = JSON.stringify(
			Array.from(this.templates.values()),
			null,
			2
		);
		await this.app.vault.adapter.write(
			".template-manager/templates.json",
			data
		);
	}

	private async saveInstances(): Promise<void> {
		const data = JSON.stringify(
			Array.from(this.instances.values()),
			null,
			2
		);
		await this.app.vault.adapter.write(
			".template-manager/instances.json",
			data
		);
	}

	private async saveGroups(): Promise<void> {
		const data = JSON.stringify(Array.from(this.groups.values()), null, 2);
		await this.app.vault.adapter.write(
			".template-manager/groups.json",
			data
		);
	}

	async loadData(): Promise<void> {
		try {
			const templatesData = await this.app.vault.adapter.read(
				".template-manager/templates.json"
			);
			const templates = JSON.parse(templatesData);

			// Migrate templates during load
			const migratedTemplates = await Promise.all(
				templates.map((t: Template) => this.migrateTemplate(t))
			);

			this.templates = new Map(
				migratedTemplates.map((t: Template) => [t.id, t])
			);

			const instancesData = await this.app.vault.adapter.read(
				".template-manager/instances.json"
			);
			const instances = JSON.parse(instancesData);
			this.instances = new Map(
				instances.map((i: TemplateInstance) => [i.id, i])
			);

			const groupsData = await this.app.vault.adapter.read(
				".template-manager/groups.json"
			);
			const groups = JSON.parse(groupsData);
			this.groups = new Map(groups.map((g: TemplateGroup) => [g.id, g]));
		} catch (error) {
			console.log("No existing data found, starting fresh");
		}
	}

	async getTemplate(
		id: string,
		resolveInheritance = true
	): Promise<Template> {
		const template = this.templates.get(id);
		if (!template) {
			throw new Error(`Template not found: ${id}`);
		}

		if (resolveInheritance && template.inheritance?.parentId) {
			return this.resolveInheritedTemplate(template);
		}

		return template;
	}

	private async resolveInheritedTemplate(
		template: Template
	): Promise<Template> {
		if (!template.inheritance?.parentId) {
			return template;
		}

		// Prevent circular inheritance
		const visited = new Set<string>();
		let current: Template | undefined = template;
		while (current) {
			if (visited.has(current.id)) {
				throw new Error("Circular inheritance detected");
			}
			visited.add(current.id);
			current = current.inheritance?.parentId
				? await this.getTemplate(current.inheritance.parentId, false)
				: undefined;
		}

		const parent = await this.getTemplate(
			template.inheritance.parentId,
			true
		);
		return this.mergeTemplates(parent, template);
	}

	private mergeTemplates(parent: Template, child: Template): Template {
		const strategy = child.inheritance?.overrideStrategy || "merge";
		const rules = child.inheritance?.mergeRules;

		if (strategy === "replace") {
			return {
				...child,
				structure:
					rules?.structure?.mode === "replace"
						? child.structure
						: this.mergeStructures(
								parent.structure,
								child.structure,
								rules?.structure
						  ),
			};
		}

		// Merge strategy
		return {
			...parent,
			...child,
			id: child.id,
			name: child.name,
			structure: this.mergeStructures(
				parent.structure,
				child.structure,
				rules?.structure
			),
			metadata: this.mergeMetadata(
				parent.metadata,
				child.metadata,
				rules?.metadata
			),
		};
	}

	private mergeStructures(
		parentStructure: TemplateNode[],
		childStructure: TemplateNode[],
		rules?: {
			mode?: string;
			nodeOverrides?: Record<string, Partial<TemplateNode>>;
		}
	): TemplateNode[] {
		const mode = rules?.mode || "append";
		const overrides = rules?.nodeOverrides || {};

		const applyOverrides = (node: TemplateNode): TemplateNode => {
			const override = overrides[node.id];
			if (!override) {
				return {
					...node,
					children: node.children.map(applyOverrides),
				};
			}
			return {
				...node,
				...override,
				children: node.children.map(applyOverrides),
			};
		};

		switch (mode) {
			case "prepend":
				return [...childStructure, ...parentStructure].map(
					applyOverrides
				);
			case "replace":
				return childStructure.map(applyOverrides);
			case "append":
			default:
				return [...parentStructure, ...childStructure].map(
					applyOverrides
				);
		}
	}

	private mergeMetadata(
		parentMetadata: Template["metadata"],
		childMetadata: Template["metadata"],
		rules?: { mode?: string; fields?: string[] }
	): Template["metadata"] {
		const mode = rules?.mode || "merge";
		const fields = rules?.fields || [];

		if (mode === "replace") {
			return childMetadata;
		}

		// Merge specific fields if specified, otherwise merge all
		const mergedMetadata = { ...parentMetadata };
		const fieldsToMerge =
			fields.length > 0 ? fields : Object.keys(childMetadata);

		for (const field of fieldsToMerge) {
			if (field in childMetadata && field in parentMetadata) {
				(mergedMetadata as any)[field] =
					childMetadata[field as keyof typeof childMetadata];
			}
		}

		return mergedMetadata;
	}
}
