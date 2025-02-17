import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TemplateNode } from "../core/Template";
import { useTemplate } from "../core/TemplateContext";

interface SortableTemplateItemProps {
	node: TemplateNode;
	dragOverlay?: boolean;
}

export function SortableTemplateItem({
	node,
	dragOverlay,
}: SortableTemplateItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const { selectedTemplate, actions } = useTemplate();

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: node.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : undefined,
		cursor: isEditing ? "text" : "grab",
	};

	const handleContentChange = async (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		if (!selectedTemplate) return;

		const updatedStructure = selectedTemplate.structure.map((n) => {
			if (n.id === node.id) {
				return { ...n, content: e.target.value };
			}
			return n;
		});

		await actions.updateTemplate(selectedTemplate.id, {
			structure: updatedStructure,
		});
	};

	const handleLevelChange = async (increment: number) => {
		if (!selectedTemplate || node.type !== "heading") return;

		const newLevel = Math.max(
			1,
			Math.min(6, (node.level || 1) + increment)
		);
		const updatedStructure = selectedTemplate.structure.map((n) => {
			if (n.id === node.id) {
				return { ...n, level: newLevel };
			}
			return n;
		});

		await actions.updateTemplate(selectedTemplate.id, {
			structure: updatedStructure,
		});
	};

	const handleDelete = async () => {
		if (!selectedTemplate) return;

		const updatedStructure = selectedTemplate.structure.filter(
			(n) => n.id !== node.id
		);

		await actions.updateTemplate(selectedTemplate.id, {
			structure: updatedStructure,
		});
	};

	const renderNodeContent = () => {
		if (isEditing) {
			switch (node.type) {
				case "heading":
				case "paragraph":
				case "list":
					return (
						<input
							type="text"
							value={node.content}
							onChange={handleContentChange}
							onBlur={() => setIsEditing(false)}
							autoFocus
							className="node-content-input"
						/>
					);
				case "codeblock":
				case "callout":
					return (
						<textarea
							value={node.content}
							onChange={handleContentChange}
							onBlur={() => setIsEditing(false)}
							autoFocus
							className="node-content-textarea"
						/>
					);
				default:
					return null;
			}
		}

		return (
			<div
				className="node-content"
				onClick={() => setIsEditing(true)}
				style={{
					fontSize:
						node.type === "heading"
							? `${1.5 - (node.level || 1) * 0.1}em`
							: undefined,
				}}
			>
				{node.content || <em>Click to edit</em>}
			</div>
		);
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`template-node ${node.type} ${
				isDragging ? "dragging" : ""
			} ${dragOverlay ? "drag-overlay" : ""}`}
			{...attributes}
			{...listeners}
		>
			<div className="node-header">
				<div className="node-type">{node.type}</div>
				{node.type === "heading" && (
					<div className="heading-controls">
						<button
							onClick={() => handleLevelChange(-1)}
							className="level-button"
							disabled={node.level === 1}
						>
							-
						</button>
						<span className="heading-level">H{node.level}</span>
						<button
							onClick={() => handleLevelChange(1)}
							className="level-button"
							disabled={node.level === 6}
						>
							+
						</button>
					</div>
				)}
				<button onClick={handleDelete} className="delete-button">
					×
				</button>
			</div>
			{renderNodeContent()}
			{node.children.length > 0 && (
				<div className="node-children">
					{node.children.map((child) => (
						<SortableTemplateItem key={child.id} node={child} />
					))}
				</div>
			)}
		</div>
	);
}
