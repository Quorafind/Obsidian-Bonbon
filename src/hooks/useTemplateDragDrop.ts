import { useState } from "react";
import {
	DragEndEvent,
	DragStartEvent,
	DragOverEvent,
	UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTemplate } from "../core/TemplateContext";
import { Template, TemplateNode } from "../core/Template";

interface DragDropState {
	activeId: UniqueIdentifier | null;
	overId: UniqueIdentifier | null;
}

export function useTemplateDragDrop() {
	const { selectedTemplate, actions } = useTemplate();
	const [dragDropState, setDragDropState] = useState<DragDropState>({
		activeId: null,
		overId: null,
	});

	const handleDragStart = (event: DragStartEvent) => {
		setDragDropState({
			...dragDropState,
			activeId: event.active.id,
		});
	};

	const handleDragOver = (event: DragOverEvent) => {
		setDragDropState({
			...dragDropState,
			overId: event.over?.id || null,
		});
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) {
			setDragDropState({ activeId: null, overId: null });
			return;
		}

		if (selectedTemplate) {
			const oldIndex = findNodeIndex(
				selectedTemplate.structure,
				active.id.toString()
			);
			const newIndex = findNodeIndex(
				selectedTemplate.structure,
				over.id.toString()
			);

			if (oldIndex !== -1 && newIndex !== -1) {
				const newStructure = arrayMove(
					selectedTemplate.structure,
					oldIndex,
					newIndex
				);

				await actions.updateTemplate(selectedTemplate.id, {
					structure: newStructure,
				});
			}
		}

		setDragDropState({ activeId: null, overId: null });
	};

	const handleDragCancel = () => {
		setDragDropState({ activeId: null, overId: null });
	};

	return {
		dragDropState,
		handleDragStart,
		handleDragOver,
		handleDragEnd,
		handleDragCancel,
	};
}

// Helper function to find node index in template structure
function findNodeIndex(structure: TemplateNode[], id: string): number {
	const flattenStructure = (nodes: TemplateNode[]): TemplateNode[] => {
		return nodes.reduce<TemplateNode[]>((acc, node) => {
			return [...acc, node, ...flattenStructure(node.children)];
		}, []);
	};

	const flatNodes = flattenStructure(structure);
	return flatNodes.findIndex((node) => node.id === id);
}

// Helper function to update node in template structure
export function updateNodeInStructure(
	structure: TemplateNode[],
	nodeId: string,
	updates: Partial<TemplateNode>
): TemplateNode[] {
	return structure.map((node) => {
		if (node.id === nodeId) {
			return { ...node, ...updates };
		}
		if (node.children.length > 0) {
			return {
				...node,
				children: updateNodeInStructure(node.children, nodeId, updates),
			};
		}
		return node;
	});
}

// Helper function to remove node from template structure
export function removeNodeFromStructure(
	structure: TemplateNode[],
	nodeId: string
): TemplateNode[] {
	return structure.reduce<TemplateNode[]>((acc, node) => {
		if (node.id === nodeId) {
			return acc;
		}
		if (node.children.length > 0) {
			return [
				...acc,
				{
					...node,
					children: removeNodeFromStructure(node.children, nodeId),
				},
			];
		}
		return [...acc, node];
	}, []);
}

// Helper function to add node to template structure
export function addNodeToStructure(
	structure: TemplateNode[],
	newNode: TemplateNode,
	parentId?: string
): TemplateNode[] {
	if (!parentId) {
		return [...structure, newNode];
	}

	return structure.map((node) => {
		if (node.id === parentId) {
			return {
				...node,
				children: [...node.children, newNode],
			};
		}
		if (node.children.length > 0) {
			return {
				...node,
				children: addNodeToStructure(node.children, newNode, parentId),
			};
		}
		return node;
	});
}
