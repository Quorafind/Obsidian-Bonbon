import {
	Menu,
	Plugin,
	TAbstractFile,
	TFolder,
	WorkspaceLeaf,
	TFile,
	CachedMetadata,
	ListItemCache,
} from "obsidian";
import { TypeDropdownComponent } from "./Dropdown";
import {
	FolderTaskItem,
	handleCallouts,
	handleTaskChanges,
	updateFileExplorerCheckboxes,
} from "./utils";

export default class BonWorkflow extends Plugin {
	private folderNames: FolderTaskItem[] = [];

	async onload() {
		// Load initial task folders from specified note
		this.app.workspace.onLayoutReady(async () => {
			const file = this.app.vault.getFileByPath("TODO.md");
			console.log(
				file,
				this.app.metadataCache.getFileCache(file as TFile)
			);
			if (file) {
				const taskItems = await handleTaskChanges(
					this.app,
					file,
					this.app.metadataCache.getFileCache(file) as CachedMetadata
				);
				console.log(taskItems);
				if (taskItems) {
					this.folderNames = taskItems;
					updateFileExplorerCheckboxes(this.app, this.folderNames);
				}
			}
		});

		// Monitor for task changes
		this.registerEvent(
			this.app.metadataCache.on(
				"changed",
				async (file: TFile, data: string, cache: CachedMetadata) => {
					const taskItems = await handleTaskChanges(
						this.app,
						file,
						cache
					);
					if (taskItems) {
						this.folderNames = taskItems;
						updateFileExplorerCheckboxes(
							this.app,
							this.folderNames
						);
					}
				}
			)
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", this.onFileMenu.bind(this))
		);

		this.registerMarkdownPostProcessor((element, context) =>
			handleCallouts(element, this, context)
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
