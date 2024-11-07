import { Component, App, TFile, PluginManifest, FileStats } from "obsidian";
import { vi } from "vitest";

// 首先声明全局的接口扩展
declare global {
	interface HTMLElement {
		addClass(className: string): void;
		removeClass(className: string): void;
		toggleClass(classes: string | string[], value: boolean): void;
		hasClass(cls: string): boolean;
		setAttr(
			qualifiedName: string,
			value: string | number | boolean | null
		): void;
		getAttr(qualifiedName: string): string | null;
		find(selector: string): HTMLElement;
		findAll(selector: string): HTMLElement[];
	}
}

export const MockComponent = class {
	load() {}
	onload() {}
	unload() {}
	onunload() {}
	addChild<T extends Component>(component: T): T {
		return component;
	}
	removeChild<T extends Component>(component: T): T {
		return component;
	}
	register(cb: () => any) {}
	registerEvent(eventRef: any) {}
	registerDomEvent(el: any, type: string, callback: any) {}
	registerInterval(id: number): number {
		return id;
	}
};
// 创建一个基础的 mock element 工厂函数
export function createMockElement(): HTMLElement {
	const element = document.createElement("div");

	// 添加 Obsidian 特定的方法
	element.addClass = function (className: string) {
		this.classList.add(className);
	};

	element.removeClass = function (className: string) {
		this.classList.remove(className);
	};

	element.toggleClass = function (
		classes: string | string[],
		value: boolean
	) {
		const classList = Array.isArray(classes) ? classes : [classes];
		classList.forEach((cls) => this.classList.toggle(cls, value));
	};

	element.hasClass = function (cls: string) {
		return this.classList.contains(cls);
	};

	element.setAttr = function (
		qualifiedName: string,
		value: string | number | boolean | null
	) {
		if (value === null) {
			this.removeAttribute(qualifiedName);
		} else {
			this.setAttribute(qualifiedName, String(value));
		}
	};

	element.getAttr = function (qualifiedName: string) {
		return this.getAttribute(qualifiedName);
	};

	element.find = function (selector: string): HTMLElement {
		const found = this.querySelector(selector);
		if (!found) {
			throw new Error(`Element not found: ${selector}`);
		}
		return found as HTMLElement;
	};

	element.findAll = function (selector: string): HTMLElement[] {
		return Array.from(this.querySelectorAll(selector));
	};

	// Add insertBefore method to match DOM API
	const originalInsertBefore = element.insertBefore;
	element.insertBefore = function (
		newNode: Node,
		referenceNode: Node | null
	) {
		if (!this.contains(referenceNode)) {
			throw new DOMException(
				"The node before which the new node is to be inserted is not a child of this node."
			);
		}
		return originalInsertBefore.call(this, newNode, referenceNode);
	};

	return element;
}

type MockTFile = {
	path: string;
	basename: string;
	extension: string;
	parent: unknown;
	vault: unknown;
	stat: FileStats;
	name: string;
};

type MockMetadataCache = {
	getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
	getFileCache(file: TFile): any;
	getCache(path: string): any;
	fileToLinktext(
		file: TFile,
		sourcePath: string,
		omitMdExtension?: boolean
	): string;
	resolvedLinks: Record<string, Record<string, number>>;
	unresolvedLinks: Record<string, Record<string, number>>;
	on(
		name: "changed" | "deleted" | "resolve" | "resolved",
		callback: any,
		ctx?: any
	): { unload: () => void };
	off(name: string, callback: any): void;
	offref(ref: any): void;
	trigger(name: string, ...data: any[]): void;
	tryTrigger(name: string, ...data: any[]): void;
};

// 添加 TAbstractFile 类
class TAbstractFile {
	vault: unknown = null;
	path: string = "";
	name: string = "";
	parent: TFolder | null = null;
}

// 添加 TFolder 类
class TFolder extends TAbstractFile {
	children: TAbstractFile[] = [];
	isRoot(): boolean {
		return this.parent === null;
	}
}

// 修改 mockObsidianObj 中的相关方法
const mockObsidianObj = {
	Plugin: class extends MockComponent {
		app: App;
		manifest: PluginManifest;

		constructor(app: App, manifest: PluginManifest) {
			super();
			this.app = app;
			this.manifest = manifest;
		}

		async loadData(): Promise<any> {
			return Promise.resolve({});
		}

		async saveData(data: any): Promise<void> {
			return Promise.resolve();
		}

		addRibbonIcon(
			icon: string,
			title: string,
			callback: (evt: MouseEvent) => any
		): HTMLElement {
			return createMockElement();
		}

		addStatusBarItem(): HTMLElement {
			return createMockElement();
		}

		addCommand(command: any): any {
			return command;
		}

		removeCommand(commandId: string): void {}

		addSettingTab(settingTab: any): void {}

		registerView(type: string, viewCreator: any): void {}

		registerHoverLinkSource(id: string, info: any): void {}

		registerExtensions(extensions: string[], viewType: string): void {}

		registerMarkdownPostProcessor(
			postProcessor: any,
			sortOrder?: number
		): any {
			return postProcessor;
		}

		registerMarkdownCodeBlockProcessor(
			language: string,
			handler: any,
			sortOrder?: number
		): any {
			return handler;
		}

		registerEditorExtension(extension: any): void {}

		registerObsidianProtocolHandler(action: string, handler: any): void {}

		registerEditorSuggest(editorSuggest: any): void {}

		onUserEnable(): void {}
	},
	Component: MockComponent,
	Menu: class {
		addItem() {
			return this;
		}
		showAtMouseEvent() {}
	},
	TFile: class implements MockTFile {
		path: string = "";
		basename: string = "";
		extension: string = "";
		parent: unknown = null;
		vault: unknown = null;
		stat: FileStats = {
			ctime: 0,
			mtime: 0,
			size: 0,
		};
		name: string = "";
	},
	// 添加 TFolder 到导出对象
	TFolder,
	Events: class {
		on(name: string, callback: any, ctx?: any): { unload: () => void } {
			return { unload: vi.fn() };
		}
	},
	MetadataCache: class extends MockComponent implements MockMetadataCache {
		resolvedLinks: Record<string, Record<string, number>> = {};
		unresolvedLinks: Record<string, Record<string, number>> = {};

		getFirstLinkpathDest(
			linkpath: string,
			sourcePath: string
		): TFile | null {
			return null;
		}

		getFileCache(file: TFile): any {
			return {
				listItems: [
					{ task: " ", position: { start: { line: 0 } } },
					{ task: "x", position: { start: { line: 1 } } },
				],
			};
		}

		getCache(path: string): any {
			const mockFile = new mockObsidianObj.TFile();
			mockFile.name = "test";
			mockFile.stat = {
				ctime: 0,
				mtime: 0,
				size: 0,
			};
			return this.getFileCache(mockFile as TFile);
		}

		fileToLinktext(
			file: TFile,
			sourcePath: string,
			omitMdExtension?: boolean
		): string {
			return file.path;
		}

		on(
			name: "changed" | "deleted" | "resolve" | "resolved",
			callback: any,
			ctx?: any
		): { unload: () => void } {
			return { unload: vi.fn() };
		}

		off(name: string, callback: any): void {}
		offref(ref: any): void {}
		trigger(name: string, ...data: any[]): void {}
		tryTrigger(name: string, ...data: any[]): void {}
	},
	MockHTMLElement: createMockElement,
};

export const mockObsidian = mockObsidianObj;
