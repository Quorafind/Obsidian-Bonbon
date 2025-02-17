import {
	ItemView,
	WorkspaceLeaf,
	TFolder,
	TFile,
	ViewStateResult,
	Vault,
} from "obsidian";
import React from "react";
import ReactDOM from "react-dom/client";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Tabs from "@radix-ui/react-tabs";
import { TemplateProvider } from "./core/TemplateContext";
import { TemplateEditor } from "./components/TemplateEditor";

export const VIEW_TYPE = "template-manager-view";

interface HeadingTemplate {
	id: string;
	level: number;
	heading: string;
	children: HeadingTemplate[];
	filePath?: string;
}

interface TemplateFile {
	id: string;
	path: string;
	tType: string;
	headings: HeadingTemplate[];
}

interface HeadingGroup {
	heading: string;
	occurrences: HeadingTemplate[];
}

interface TemplateViewProps {
	templates: TemplateFile[];
	onTemplatesChange: (templates: TemplateFile[]) => void;
}

interface SortableTemplateItemProps {
	template: HeadingTemplate;
}

interface HeadingListProps {
	headings: HeadingTemplate[];
	onDrop: (heading: HeadingTemplate, target: HeadingTemplate) => void;
}

const SortableHeadingItem: React.FC<{ heading: HeadingTemplate }> = ({
	heading,
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: heading.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 1000 : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`heading-item ${isDragging ? "dragging" : ""}`}
			{...attributes}
			{...listeners}
		>
			<span className="heading-text">{heading.heading}</span>
			<span className="heading-file">{heading.filePath}</span>
		</div>
	);
};

const HeadingList: React.FC<HeadingListProps> = ({ headings, onDrop }) => {
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over) return;

		if (active.id !== over.id) {
			const activeHeading = headings.find(
				(h) => h.id === active.id.toString()
			);
			const overHeading = headings.find(
				(h) => h.id === over.id.toString()
			);

			if (activeHeading && overHeading) {
				onDrop(activeHeading, overHeading);
			}
		}
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={headings.map((h) => h.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="heading-list">
					{headings.map((heading) => (
						<SortableHeadingItem
							key={heading.id}
							heading={heading}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
};

const SortableTemplateItem: React.FC<SortableTemplateItemProps> = ({
	template,
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: template.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		marginLeft: `${(template.level - 1) * 20}px`,
		opacity: isDragging ? 0.5 : undefined,
		zIndex: isDragging ? 1000 : undefined,
		position: isDragging ? ("relative" as const) : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`template-item ${isDragging ? "dragging" : ""}`}
			{...attributes}
			{...listeners}
		>
			<div className="template-heading">{template.heading}</div>
			{template.children.map((child) => (
				<SortableTemplateItem key={child.id} template={child} />
			))}
		</div>
	);
};

const TemplateView: React.FC<TemplateViewProps> = ({
	templates,
	onTemplatesChange,
}) => {
	const [activeTab, setActiveTab] = React.useState<string>("");
	const uniqueTypes = Array.from(
		new Set(templates.map((t) => t.tType))
	).filter(Boolean);

	React.useEffect(() => {
		if (uniqueTypes.length > 0 && !activeTab) {
			setActiveTab(uniqueTypes[0]);
		}
	}, [uniqueTypes]);

	// 获取重复的标题
	const getDuplicateHeadings = (type: string) => {
		const headings = templates
			.filter((t) => t.tType === type)
			.flatMap((t) => t.headings);

		// 按照标题和层级分组
		const groups: Record<string, HeadingTemplate[]> = {};
		headings.forEach((h) => {
			const key = `${h.level}-${h.heading}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(h);
		});

		// 找出重复的标题组
		const duplicateGroups = Object.entries(groups)
			.filter(([_, group]) => group.length >= 2)
			.map(([key, occurrences]) => ({
				heading: occurrences[0].heading,
				occurrences: occurrences.sort((a, b) =>
					a.filePath && b.filePath
						? a.filePath.localeCompare(b.filePath)
						: 0
				),
			}));

		return duplicateGroups;
	};

	// 获取单次出现的标题
	const getSingleHeadings = (type: string) => {
		const headings = templates
			.filter((t) => t.tType === type)
			.flatMap((t) => t.headings);

		// 按照标题和层级分组
		const groups: Record<string, HeadingTemplate[]> = {};
		headings.forEach((h) => {
			const key = `${h.level}-${h.heading}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(h);
		});

		// 返回只出现一次的标题
		return headings.filter((h) => {
			const key = `${h.level}-${h.heading}`;
			return groups[key].length === 1;
		});
	};

	const handleLeftPanelDrop = (
		heading: HeadingTemplate,
		target: HeadingTemplate
	) => {
		const updatedTemplates = [...templates];
		const sourceFile = updatedTemplates.find((t) =>
			t.headings.some((h) => h.id === heading.id)
		);
		const targetFile = updatedTemplates.find((t) =>
			t.headings.some((h) => h.id === target.id)
		);

		if (sourceFile && targetFile) {
			// 移动标题到目标文件
			sourceFile.headings = sourceFile.headings.filter(
				(h) => h.id !== heading.id
			);
			targetFile.headings.push({
				...heading,
				filePath: targetFile.path,
			});

			onTemplatesChange(updatedTemplates);
		}
	};

	const handleRightPanelDrop = (
		heading: HeadingTemplate,
		target: HeadingTemplate
	) => {
		const updatedTemplates = [...templates];
		const sourceFile = updatedTemplates.find((t) =>
			t.headings.some((h) => h.id === heading.id)
		);

		if (sourceFile) {
			// 重新排序同组内的标题
			const headings = sourceFile.headings;
			const oldIndex = headings.findIndex((h) => h.id === heading.id);
			const newIndex = headings.findIndex((h) => h.id === target.id);

			if (oldIndex !== -1 && newIndex !== -1) {
				sourceFile.headings = arrayMove(headings, oldIndex, newIndex);
				onTemplatesChange(updatedTemplates);
			}
		}
	};

	return (
		<div className="template-manager-container">
			<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
				<Tabs.List className="tabs-list">
					{uniqueTypes.map((type) => (
						<Tabs.Trigger
							key={type}
							value={type}
							className="tab-trigger"
						>
							{type}
						</Tabs.Trigger>
					))}
				</Tabs.List>

				{uniqueTypes.map((type) => (
					<Tabs.Content key={type} value={type}>
						<div className="panels-container">
							<div className="left-panel">
								<HeadingList
									headings={getSingleHeadings(type)}
									onDrop={handleLeftPanelDrop}
								/>
							</div>
							<div className="right-panel">
								{getDuplicateHeadings(type).map((group) => (
									<div
										key={group.heading}
										className="heading-group"
									>
										<h3>{group.heading}</h3>
										<HeadingList
											headings={group.occurrences}
											onDrop={handleRightPanelDrop}
										/>
									</div>
								))}
							</div>
						</div>
					</Tabs.Content>
				))}
			</Tabs.Root>
		</div>
	);
};

export class TemplateManagerView extends ItemView {
	private root: ReactDOM.Root | null = null;
	private folder: TFolder | null = null;
	private folderPath: string | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Template Manager";
	}

	getIcon(): string {
		return "layout-template";
	}

	async setState(
		state: {
			folder: string;
		},
		result: ViewStateResult
	): Promise<void> {
		if (state && typeof state === "object" && "folder" in state) {
			this.folderPath = state.folder;
			const folder = this.app.vault.getFolderByPath(state.folder);

			if (folder instanceof TFolder) {
				this.folder = folder;
				this.render();
			} else {
				console.error("Folder not found");
			}
		}
		await super.setState(state, result);
	}

	getState(): Record<string, unknown> {
		return {
			folder: this.folderPath,
		};
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose() {
		if (this.root) {
			this.root.unmount();
		}
	}

	private render() {
		if (!this.root) {
			this.root = ReactDOM.createRoot(this.contentEl);
		}

		this.root.render(
			<TemplateProvider app={this.app}>
				<TemplateEditor />
			</TemplateProvider>
		);
	}
}
