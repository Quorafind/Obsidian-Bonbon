import { Component, Menu, setIcon } from "obsidian";

export class CustomStatusBar extends Component {
	private containerEl: HTMLElement;
	private counts: InputCounts = {
		characters: 0,
		punctuation: 0,
		pasteCount: 0,
		dropCount: 0,
		compositionLength: 0,
	};

	private countEl: HTMLElement;

	constructor(containerEl: HTMLElement, readonly config: CountConfig) {
		super();
		this.containerEl = containerEl;
	}

	onload() {
		this.containerEl.toggleClass("bonbon-status-bar", true);
		this.containerEl.createSpan("bonbon-status-bar-item", (el) => {
			setIcon(el, "square");
		});

		this.countEl = this.containerEl.createEl("span", {
			text: `Characters: ${this.counts.characters}`,
			title: `Characters: ${this.counts.characters}`,
		});
	}

	onunload(): void {
		this.containerEl.empty();
	}

	update(counts: InputCounts) {
		this.counts = counts;
		if (this.config.countChars) {
			this.countEl.textContent = `Characters: ${this.counts.characters}`;
			this.countEl.title = `Characters: ${this.counts.characters}`;
		}
	}

	getCounts() {
		return this.counts;
	}
}
