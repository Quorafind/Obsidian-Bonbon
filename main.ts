import { Menu, Plugin, TAbstractFile, TFolder, WorkspaceLeaf } from "obsidian";

export default class BonWorkflow extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on("file-menu", this.onFileMenu.bind(this))
		);
	}

	onunload() {}

	onFileMenu(
		menu: Menu,
		file: TAbstractFile,
		source: string,
		leaf?: WorkspaceLeaf
	) {
		menu.addItem((item) => {
			item.setIcon("search")
				.setTitle("Search in selected folder")
				.onClick(() => {
					const leaf =
						this.app.workspace.getLeavesOfType("search")[0];
					if (leaf && leaf.isDeferred) {
						leaf.loadIfDeferred();
					}
					const viewState = leaf?.getViewState();
					this.app.workspace.revealLeaf(leaf);
					leaf?.setViewState({
						...viewState,
						active: true,
					});
					leaf?.view.setState(
						{
							query:
								file instanceof TFolder
									? `path:"${file.path}/"`
									: `path:"${file.path}"`,
						},
						{
							history: false,
						}
					);
				});
		});
	}
}
