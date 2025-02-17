import React, { useState } from "react";
import { Template, TemplateNode } from "../core/Template";
import { useTemplate } from "../core/TemplateContext";
import * as Tabs from "@radix-ui/react-tabs";

interface TemplatePreviewProps {
	template: Template;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
	const [previewMode, setPreviewMode] = useState<"structure" | "instance">(
		"structure"
	);
	const [sampleData, setSampleData] = useState<Record<string, string>>({});

	const renderNode = (node: TemplateNode, level = 0): JSX.Element => {
		const indent = "  ".repeat(level);
		const commonProps = {
			className: `preview-node preview-node-${node.type}`,
			style: { marginLeft: `${level * 20}px` },
		};

		switch (node.type) {
			case "heading":
				return (
					<div {...commonProps} key={node.id}>
						{`${"#".repeat(node.level || 1)} ${interpolateVariables(
							node.content
						)}`}
					</div>
				);
			case "paragraph":
				return (
					<div {...commonProps} key={node.id}>
						{interpolateVariables(node.content)}
					</div>
				);
			case "codeblock":
				return (
					<div {...commonProps} key={node.id}>
						<pre>
							<code>{interpolateVariables(node.content)}</code>
						</pre>
					</div>
				);
			case "list":
				return (
					<div {...commonProps} key={node.id}>
						{`- ${interpolateVariables(node.content)}`}
						{node.children.map((child) =>
							renderNode(child, level + 1)
						)}
					</div>
				);
			case "callout":
				return (
					<div {...commonProps} key={node.id}>
						{`> ${interpolateVariables(node.content)}`}
						{node.children.map((child) =>
							renderNode(child, level + 1)
						)}
					</div>
				);
			default:
				return (
					<div {...commonProps} key={node.id}>
						{interpolateVariables(node.content)}
					</div>
				);
		}
	};

	const interpolateVariables = (content: string): string => {
		return content.replace(/\{\{(.*?)\}\}/g, (match, variable) => {
			const trimmedVar = variable.trim();
			return previewMode === "instance"
				? sampleData[trimmedVar] || match
				: match;
		});
	};

	const handleSampleDataChange = (key: string, value: string) => {
		setSampleData((prev) => ({ ...prev, [key]: value }));
	};

	const extractVariables = (nodes: TemplateNode[]): string[] => {
		const variables = new Set<string>();
		const processNode = (node: TemplateNode) => {
			const matches = node.content.match(/\{\{(.*?)\}\}/g) || [];
			matches.forEach((match) => {
				variables.add(match.slice(2, -2).trim());
			});
			node.children.forEach(processNode);
		};
		nodes.forEach(processNode);
		return Array.from(variables);
	};

	const variables = extractVariables(template.structure);

	return (
		<div className="template-preview">
			<Tabs.Root defaultValue="structure">
				<Tabs.List className="preview-tabs-list">
					<Tabs.Trigger
						value="structure"
						onClick={() => setPreviewMode("structure")}
						className="preview-tab"
					>
						Structure
					</Tabs.Trigger>
					<Tabs.Trigger
						value="instance"
						onClick={() => setPreviewMode("instance")}
						className="preview-tab"
					>
						Instance
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="structure" className="preview-content">
					<div className="preview-structure">
						{template.structure.map((node) => renderNode(node))}
					</div>
				</Tabs.Content>

				<Tabs.Content value="instance" className="preview-content">
					<div className="preview-instance">
						<div className="preview-variables">
							<h3>Variables</h3>
							{variables.map((variable) => (
								<div key={variable} className="variable-input">
									<label>{variable}:</label>
									<input
										type="text"
										value={sampleData[variable] || ""}
										onChange={(e) =>
											handleSampleDataChange(
												variable,
												e.target.value
											)
										}
										placeholder={`Enter value for ${variable}`}
									/>
								</div>
							))}
						</div>
						<div className="preview-rendered">
							{template.structure.map((node) => renderNode(node))}
						</div>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	);
}
