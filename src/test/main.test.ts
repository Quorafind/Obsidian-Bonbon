import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockObsidian } from "./mocks";

// 设置 mock
vi.mock("obsidian", () => mockObsidian);

// 导入其他依赖
import { App, Component, Menu, Plugin, TFile, MetadataCache, TFolder, PluginManifest } from "obsidian";
import BonWorkflow from "../main";

describe("BonWorkflow", () => {
	let plugin: BonWorkflow;
	let mockApp: any;
	let layoutReadyCallback: () => void;

	beforeEach(() => {
		mockApp = {
				workspace: {
					onLayoutReady: (callback: () => any) => {
						layoutReadyCallback = callback;
					},
					on: () => ({ unload: vi.fn() }),
					getLeavesOfType: () => [
						{
							isDeferred: true,
							loadIfDeferred: vi.fn(),
							getViewState: () => ({}),
							setViewState: vi.fn(),
							view: { setState: vi.fn() },
							revealLeaf: vi.fn(),
						},
					],
					revealLeaf: vi.fn(),
				},
				vault: {
					getFileByPath: (path: string) => {
						if (path === "TODO.md") {
							const file = new mockObsidian.TFile();
							(file as any).name = "TODO.md";
							(file as any).path = "TODO.md";
							(file as any).stat = {
								ctime: 0,
								mtime: 0,
								size: 0
							};
							return file;
						}
						return null;
					},
					read: async () => "- [ ] Task 1\n- [x] Task 2",
				},
				metadataCache: new (vi.mocked(MetadataCache))(),
			};

		const mockManifest: PluginManifest = {
			id: "test-plugin",
			name: "Test Plugin",
			version: "1.0.0",
			author: "Test Author",
			minAppVersion: "0.15.0",
			description: "A test plugin"
		};

		plugin = new BonWorkflow(mockApp as unknown as App, mockManifest);
	});

	describe('Plugin Initialization', () => {
		it("should initialize plugin correctly", async () => {
			expect(plugin).toBeDefined();
			expect(plugin.app).toBeDefined();
			expect(plugin.manifest).toBeDefined();
		});

		it("should load and process TODO.md on startup", async () => {
			await plugin.onload();
			layoutReadyCallback();
			
			const folderNames = (plugin as any).folderNames;
			expect(folderNames).toBeDefined();
		});

		it("should register event handlers", async () => {
			const registerEventSpy = vi.spyOn(plugin, 'registerEvent');
			await plugin.onload();
			
			expect(registerEventSpy).toHaveBeenCalled();
		});
	});

	describe('File Menu Handling', () => {
		it("should add search item to file menu for folder", () => {
			const mockMenu = {
				addItem: vi.fn((callback) => {
					const mockItem = {
						setIcon: vi.fn().mockReturnThis(),
						setTitle: vi.fn().mockReturnThis(),
						onClick: vi.fn().mockReturnThis(),
					};
					callback(mockItem);
					return mockItem;
				}),
			} as unknown as Menu;

			const mockFolder = { path: "test/folder" } as TFolder;
			plugin.onFileMenu(mockMenu, mockFolder, "");

			expect(mockMenu.addItem).toHaveBeenCalled();
		});

		it("should add search item to file menu for file", () => {
			const mockMenu = {
				addItem: vi.fn((callback) => {
					const mockItem = {
						setIcon: vi.fn().mockReturnThis(),
						setTitle: vi.fn().mockReturnThis(),
						onClick: vi.fn().mockReturnThis(),
					};
					callback(mockItem);
					return mockItem;
				}),
			} as unknown as Menu;

			const mockFile = { path: "test/file.md" } as TFile;
			plugin.onFileMenu(mockMenu, mockFile, "");

			expect(mockMenu.addItem).toHaveBeenCalled();
		});
	});
});
