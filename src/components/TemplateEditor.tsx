import React from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTemplate } from "../core/TemplateContext";
import { useTemplateDragDrop } from "../hooks/useTemplateDragDrop";
import { TemplateNode } from "../core/Template";
import { SortableTemplateItem } from "./SortableTemplateItem";
import { TemplateList } from "./TemplateList";
import * as Tabs from "@radix-ui/react-tabs";
import { TemplatePreview } from "./TemplatePreview";

export function TemplateEditor() {
	const { selectedTemplate, selectedInstance, isLoading, error, actions } =
		useTemplate();

	const {
		dragDropState,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	} = useTemplateDragDrop();

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

	if (isLoading) {
		return <div className="template-editor-loading">Loading...</div>;
	}

	if (error) {
		return <div className="template-editor-error">{error.message}</div>;
	}

	if (!selectedTemplate) {
		return (
			<div className="template-editor-empty">
				Select a template to edit
			</div>
		);
	}

	return (
		<div className="template-editor">
			<Tabs.Root defaultValue="edit" className="template-editor-tabs">
				<Tabs.List className="template-editor-tabs-list">
					<Tabs.Trigger value="edit" className="template-editor-tab">
						Edit
					</Tabs.Trigger>
					<Tabs.Trigger
						value="preview"
						className="template-editor-tab"
					>
						Preview
					</Tabs.Trigger>
					<Tabs.Trigger
						value="settings"
						className="template-editor-tab"
					>
						Settings
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="edit" className="template-editor-content">
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
						onDragCancel={handleDragCancel}
					>
						<SortableContext
							items={selectedTemplate.structure.map(
								(node) => node.id
							)}
							strategy={verticalListSortingStrategy}
						>
							{selectedTemplate.structure.map((node) => (
								<SortableTemplateItem
									key={node.id}
									node={node}
									dragOverlay={
										dragDropState.activeId === node.id
									}
								/>
							))}
						</SortableContext>
					</DndContext>
				</Tabs.Content>

				<Tabs.Content
					value="preview"
					className="template-editor-content"
				>
					<TemplatePreview template={selectedTemplate} />
				</Tabs.Content>

				<Tabs.Content
					value="settings"
					className="template-editor-content"
				>
					<div className="template-settings">
						<h3>Template Settings</h3>
						<div className="settings-group">
							<label>Name:</label>
							<input
								type="text"
								value={selectedTemplate.name}
								onChange={(e) =>
									actions.updateTemplate(
										selectedTemplate.id,
										{
											name: e.target.value,
										}
									)
								}
							/>
						</div>
						<div className="settings-group">
							<label>Description:</label>
							<textarea
								value={selectedTemplate.description || ""}
								onChange={(e) =>
									actions.updateTemplate(
										selectedTemplate.id,
										{
											description: e.target.value,
										}
									)
								}
							/>
						</div>
						{selectedTemplate.inheritance?.parentId && (
							<div className="settings-group">
								<label>Parent Template:</label>
								<select
									value={
										selectedTemplate.inheritance.parentId
									}
									onChange={(e) =>
										actions.updateTemplate(
											selectedTemplate.id,
											{
												inheritance: {
													...selectedTemplate.inheritance,
													parentId: e.target.value,
												},
											}
										)
									}
								>
									{/* Add parent template options */}
								</select>
							</div>
						)}
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	);
}
