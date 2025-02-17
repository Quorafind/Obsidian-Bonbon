import React, { createContext, useContext, useEffect, useState } from "react";
import { App } from "obsidian";
import { Template, TemplateInstance, TemplateGroup } from "./Template";
import { TemplateService } from "./TemplateService";

interface TemplateContextType {
	templates: Template[];
	instances: TemplateInstance[];
	groups: TemplateGroup[];
	selectedTemplate: Template | null;
	selectedInstance: TemplateInstance | null;
	selectedGroup: TemplateGroup | null;
	isLoading: boolean;
	error: Error | null;
	service: TemplateService;
	actions: {
		selectTemplate: (template: Template | null) => void;
		selectInstance: (instance: TemplateInstance | null) => void;
		selectGroup: (group: TemplateGroup | null) => void;
		createTemplate: (name: string, structure: any[]) => Promise<Template>;
		updateTemplate: (
			id: string,
			updates: Partial<Template>
		) => Promise<Template>;
		createInstance: (
			templateId: string,
			file: any
		) => Promise<TemplateInstance>;
		updateInstance: (
			id: string,
			updates: Partial<TemplateInstance>
		) => Promise<TemplateInstance>;
		createGroup: (
			name: string,
			templates?: Template[]
		) => Promise<TemplateGroup>;
		applyTemplateToFile: (templateId: string, file: any) => Promise<void>;
	};
}

const TemplateContext = createContext<TemplateContextType | undefined>(
	undefined
);

export function TemplateProvider({
	children,
	app,
}: {
	children: React.ReactNode;
	app: App;
}) {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [instances, setInstances] = useState<TemplateInstance[]>([]);
	const [groups, setGroups] = useState<TemplateGroup[]>([]);
	const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
		null
	);
	const [selectedInstance, setSelectedInstance] =
		useState<TemplateInstance | null>(null);
	const [selectedGroup, setSelectedGroup] = useState<TemplateGroup | null>(
		null
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [service] = useState(() => new TemplateService(app));

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		try {
			setIsLoading(true);
			await service.loadData();
			// Update state with loaded data
			setTemplates(Array.from(service["templates"].values()));
			setInstances(Array.from(service["instances"].values()));
			setGroups(Array.from(service["groups"].values()));
		} catch (err) {
			setError(
				err instanceof Error ? err : new Error("Failed to load data")
			);
		} finally {
			setIsLoading(false);
		}
	};

	const value: TemplateContextType = {
		templates,
		instances,
		groups,
		selectedTemplate,
		selectedInstance,
		selectedGroup,
		isLoading,
		error,
		service,
		actions: {
			selectTemplate: setSelectedTemplate,
			selectInstance: setSelectedInstance,
			selectGroup: setSelectedGroup,
			createTemplate: async (name, structure) => {
				const template = await service.createTemplate(name, structure);
				setTemplates([...templates, template]);
				return template;
			},
			updateTemplate: async (id, updates) => {
				const template = await service.updateTemplate(id, updates);
				setTemplates(
					templates.map((t) => (t.id === id ? template : t))
				);
				return template;
			},
			createInstance: async (templateId, file) => {
				const instance = await service.createInstance(templateId, file);
				setInstances([...instances, instance]);
				return instance;
			},
			updateInstance: async (id, updates) => {
				const instance = await service.updateInstance(id, updates);
				setInstances(
					instances.map((i) => (i.id === id ? instance : i))
				);
				return instance;
			},
			createGroup: async (name, templates = []) => {
				const group = await service.createGroup(name, templates);
				setGroups([...groups, group]);
				return group;
			},
			applyTemplateToFile: async (templateId, file) => {
				await service.applyTemplateToFile(templateId, file);
				await loadData(); // Refresh data after applying template
			},
		},
	};

	return (
		<TemplateContext.Provider value={value}>
			{children}
		</TemplateContext.Provider>
	);
}

export function useTemplate() {
	const context = useContext(TemplateContext);
	if (context === undefined) {
		throw new Error("useTemplate must be used within a TemplateProvider");
	}
	return context;
}
