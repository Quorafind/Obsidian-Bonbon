import { TFile } from "obsidian";

export type TemplateNodeType =
	| "heading"
	| "paragraph"
	| "codeblock"
	| "list"
	| "callout";
export type TemplateNodeStatus = "active" | "archived" | "draft";

export interface TemplateNode {
	id: string;
	type: TemplateNodeType;
	content: string;
	level?: number; // For headings
	children: TemplateNode[];
	metadata?: Record<string, unknown>;
}

export interface Template {
	id: string;
	name: string;
	description?: string;
	structure: TemplateNode[];
	instances: TemplateInstance[];
	metadata: {
		version: string;
		createdAt: string;
		updatedAt: string;
		targetFolder?: string;
		fileNamingPattern?: string;
		status: TemplateNodeStatus;
		tags?: string[];
		migrationHistory?: Array<{
			fromVersion: string;
			toVersion: string;
			timestamp: string;
		}>;
	};
	inheritance?: {
		parentId?: string;
		overrideStrategy?: "merge" | "replace";
		mergeRules?: {
			structure?: {
				mode: "append" | "prepend" | "replace";
				nodeOverrides?: Record<string, Partial<TemplateNode>>;
			};
			metadata?: {
				mode: "merge" | "replace";
				fields?: string[];
			};
		};
	};
}

export interface TemplateInstance {
	id: string;
	templateId: string;
	file: TFile;
	structure: TemplateNode[];
	metadata: {
		createdAt: string;
		updatedAt: string;
		version: string;
		customizations?: {
			addedNodes: TemplateNode[];
			removedNodeIds: string[];
			modifiedNodes: Record<string, Partial<TemplateNode>>;
		};
	};
}

export interface TemplateGroup {
	id: string;
	name: string;
	templates: Template[];
	metadata?: {
		description?: string;
		icon?: string;
		color?: string;
	};
}
