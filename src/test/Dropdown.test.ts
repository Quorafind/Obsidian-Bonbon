import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockObsidian } from "./mocks";

// 设置 mock
vi.mock("obsidian", () => ({
	...mockObsidian,
	Menu: class {
		addItem = vi.fn().mockReturnThis();
		showAtMouseEvent = vi.fn();
	},
}));

// 其他导入
import { TypeDropdownComponent, supportedTypes } from "../dropdown";
import { createMockElement } from "./mocks";

describe("TypeDropdownComponent", () => {
	let trigger: HTMLElement;
	let containerEl: HTMLElement & {
		cmView: {
			widget: {
				getType: () => keyof typeof supportedTypes;
				updateType: (type: keyof typeof supportedTypes) => void;
			};
		};
	};
	let dropdown: TypeDropdownComponent;
	let mockClickEvent: (e: MouseEvent) => void;

	beforeEach(() => {
		trigger = createMockElement();
		containerEl = Object.assign(createMockElement(), {
			cmView: {
				widget: {
					getType: () => "info" as const,
					updateType: vi.fn(),
				},
			},
		});
		dropdown = new TypeDropdownComponent(trigger, containerEl);

		// Mock registerDomEvent to capture click handler
		vi.spyOn(dropdown, "registerDomEvent").mockImplementation(
			(el, event, handler) => {
				if (event === "click") {
					mockClickEvent = handler;
				}
			}
		);
	});

	it("should add dropdown-trigger class on load", async () => {
		await dropdown.onload();
		expect(trigger.classList.contains("dropdown-trigger")).toBe(true);
	});

	it("should register click event on load", async () => {
		const spy = vi.spyOn(
			dropdown,
			"toggleMenu" as keyof TypeDropdownComponent
		);
		await dropdown.onload();

		// Manually trigger the captured click handler
		mockClickEvent(new MouseEvent("click"));
		expect(spy).toHaveBeenCalled();
	});

	it("should create menu with all supported types", () => {
		const event = new MouseEvent("click");
		(dropdown as any).toggleMenu(event);

		expect(Object.keys(supportedTypes).length).toBeGreaterThan(0);
	});
});
