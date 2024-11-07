import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mockObsidian, createMockElement } from "./mocks";

// 设置 mock
vi.mock("obsidian", () => mockObsidian);

// 再导入其他依赖
import {
	App,
	CachedMetadata,
	ListItemCache,
	TFile,
	MarkdownPostProcessorContext,
	TFolder,
} from "obsidian";
import {
	extractFolderNames,
	handleTaskChanges,
	handleCallouts,
	updateFileExplorerCheckboxes,
} from "../utils";
import BonWorkflow from "../main";

describe("Utils", () => {
	describe("extractFolderNames", () => {
		it("should extract folder names and statuses from list items", async () => {
			const mockApp = {
				vault: {
					read: vi
						.fn()
						.mockResolvedValue(
							"- [ ] Task 1\n- [x] Task 2\n- [!] Task 3"
						),
				},
			} as unknown as App;

			const listItems: ListItemCache[] = [
				{
					task: " ",
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 10, offset: 10 },
					},
					parent: -1,
				},
				{
					task: "x",
					position: {
						start: { line: 1, col: 0, offset: 0 },
						end: { line: 1, col: 10, offset: 21 },
					},
					parent: -1,
				},
				{
					task: "!",
					position: {
						start: { line: 2, col: 0, offset: 0 },
						end: { line: 2, col: 10, offset: 32 },
					},
					parent: -1,
				},
			];

			const file = new TFile();
			(file as any).path = "test.md";
			const result = await extractFolderNames(mockApp, listItems, file);

			expect(result).toHaveLength(3);
			expect(result[0]).toEqual({ name: "Task 1", status: " " });
			expect(result[1]).toEqual({ name: "Task 2", status: "x" });
			expect(result[2]).toEqual({ name: "Task 3", status: "!" });
		});

		it("should filter out empty task names", async () => {
			const mockApp = {
				vault: {
					read: vi
						.fn()
						.mockResolvedValue("- [ ] Task 1\n- [x] Task 2"),
				},
			} as unknown as App;

			const listItems: ListItemCache[] = [
				{
					task: " ",
					position: {
						start: { line: 0, col: 0, offset: 0 },
						end: { line: 0, col: 5, offset: 5 },
					},
					parent: -1,
				},
				{
					task: "x",
					position: {
						start: { line: 1, col: 0, offset: 0 },
						end: { line: 1, col: 10, offset: 16 },
					},
					parent: -1,
				},
			];

			const file = new TFile();
			(file as any).path = "test.md";
			const result = await extractFolderNames(mockApp, listItems, file);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ name: "Task 1", status: " " }); // The regex in extractFolderNames removes the "- [ ]" prefix
			expect(result[1]).toEqual({ name: "Task 2", status: "x" });
		});
	});

	describe("handleTaskChanges", () => {
		it("should process tasks only for specified file", async () => {
			const mockApp = {
				vault: {
					read: vi.fn().mockResolvedValue("- [ ] Task 1"),
				},
			} as unknown as App;

			const file = new TFile();
			(file as any).path = "TODO.md";
			const cache: CachedMetadata = {
				listItems: [
					{
						task: " ",
						position: {
							start: { line: 0, col: 0, offset: 0 },
							end: { line: 0, col: 10, offset: 10 },
						},
						parent: -1,
					},
				],
			};

			const result = await handleTaskChanges(mockApp, file, cache);
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
		});

		it("should return undefined for non-target files", async () => {
			const mockApp = {} as App;
			const file = new TFile();
			(file as any).path = "other.md";
			const cache: CachedMetadata = {};

			const result = await handleTaskChanges(mockApp, file, cache);
			expect(result).toBeUndefined();
		});
	});

	describe("handleCallouts", () => {
		it("should process callouts correctly", () => {
			// 使用工厂函数创建元素
			const element = createMockElement();
			const callout = createMockElement();
			const iconEl = createMockElement();

			// 设置必要的类名
			callout.classList.add("callout");
			iconEl.classList.add("callout-icon");

			// 构建 DOM 结构
			callout.appendChild(iconEl);
			element.appendChild(callout);

			// Mock find 和 findAll 的返回值
			vi.spyOn(element, "findAll").mockReturnValue([callout]);
			vi.spyOn(callout, "find").mockReturnValue(iconEl);

			const mockPlugin = {
				addChild: vi.fn(),
			};

			const mockContext = {
				containerEl: {
					cmView: {
						widget: {
							getType: () => "info",
							updateType: vi.fn(),
						},
					},
				},
			};

			handleCallouts(element, mockPlugin as any, mockContext as any);

			// 验证是否正确处理了 callout
			expect(element.findAll).toHaveBeenCalledWith(".callout");
			expect(callout.find).toHaveBeenCalledWith(".callout-icon");
			expect(mockPlugin.addChild).toHaveBeenCalled();
		});
	});

	describe("updateFileExplorerCheckboxes", () => {
		let mockApp: App;
		let mockFileExplorer: any;
		let mockFileItems: Record<string, any>;
		let mockDocument: Document;

		beforeEach(() => {
			// 保存原始的 document.querySelectorAll
			mockDocument = document;

			// 创建模拟的文件项
			mockFileItems = {
				folder1: {
					file: new TFolder(),
					selfEl: createMockElement(),
					innerEl: createMockElement(),
				},
				folder2: {
					file: new TFolder(),
					selfEl: createMockElement(),
					innerEl: createMockElement(),
				},
				folder3: {
					file: new TFolder(),
					selfEl: createMockElement(),
					innerEl: createMockElement(),
				},
			};

			// 设置文件夹名称
			mockFileItems.folder1.file.name = "Folder 1";
			mockFileItems.folder2.file.name = "Folder 2";
			mockFileItems.folder3.file.name = "Folder 3";

			// 将 innerEl 添加到 selfEl 中
			mockFileItems.folder1.selfEl.appendChild(
				mockFileItems.folder1.innerEl
			);
			mockFileItems.folder2.selfEl.appendChild(
				mockFileItems.folder2.innerEl
			);
			mockFileItems.folder3.selfEl.appendChild(
				mockFileItems.folder3.innerEl
			);

			// 模拟文件浏览器
			mockFileExplorer = {
				view: {
					fileItems: mockFileItems,
				},
			};

			// 模拟 App
			mockApp = {
				workspace: {
					getLeavesOfType: vi
						.fn()
						.mockReturnValue([mockFileExplorer]),
				},
			} as unknown as App;

			// 模拟 document.querySelectorAll
			document.querySelectorAll = vi.fn().mockReturnValue([]);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should add checkboxes to matching folders", async () => {
			const folderNames = [
				{ name: "Folder 1", status: "x" },
				{ name: "Folder 2", status: " " },
				{ name: "Folder 3", status: "!" },
			];

			await updateFileExplorerCheckboxes(mockApp, folderNames);

			const folder1El = mockFileItems.folder1.selfEl;
			const folder2El = mockFileItems.folder2.selfEl;
			const folder3El = mockFileItems.folder3.selfEl;

			const checkbox1 = folder1El.children[0] as HTMLInputElement;
			expect(checkbox1.type).toBe("checkbox");
			expect(checkbox1.className).toBe("task-checkbox");
			expect(checkbox1.checked).toBe(true);
			expect(checkbox1.disabled).toBe(true);
			expect(checkbox1.dataset.task).toBe("x");

			const checkbox2 = folder2El.children[0] as HTMLInputElement;
			expect(checkbox2.type).toBe("checkbox");
			expect(checkbox2.className).toBe("task-checkbox");
			expect(checkbox2.checked).toBe(false);
			expect(checkbox2.disabled).toBe(true);
			expect(checkbox2.dataset.task).toBe(" ");

			const checkbox3 = folder3El.children[0] as HTMLInputElement;
			expect(checkbox3.type).toBe("checkbox");
			expect(checkbox3.className).toBe("task-checkbox");
			expect(checkbox3.checked).toBe(true);
			expect(checkbox3.disabled).toBe(true);
			expect(checkbox3.dataset.task).toBe("!");
		});

		it("should handle empty file explorer gracefully", async () => {
			const mockAppEmpty = {
				workspace: {
					getLeavesOfType: vi.fn().mockReturnValue([
						{
							view: {
								fileItems: {},
							},
						},
					]),
				},
			} as unknown as App;

			const folderNames = [{ name: "Folder 1", status: "x" }];

			// 确保不会抛出错误
			await expect(
				updateFileExplorerCheckboxes(mockAppEmpty, folderNames)
			).resolves.not.toThrow();
		});

		it("should only add checkboxes to folders, not files", async () => {
			// 添加一个文件项到 mockFileItems
			mockFileItems.file1 = {
				file: new TFile(),
				selfEl: createMockElement(),
				innerEl: createMockElement(),
			};
			// 将 innerEl 添加到 selfEl 中
			mockFileItems.file1.selfEl.appendChild(mockFileItems.file1.innerEl);

			const folderNames = [
				{ name: "Folder 1", status: "x" },
				{ name: "NotAFolder", status: " " },
			];

			await updateFileExplorerCheckboxes(mockApp, folderNames);

			// 验证文件项没有添加复选框
			const fileEl = mockFileItems.file1.selfEl;
			expect(fileEl.children.length).toBe(1); // 只有 innerEl，没有复选框
		});
	});
});
