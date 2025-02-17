import React from "react";
import { useTemplate } from "../core/TemplateContext";
import { Template } from "../core/Template";

export function TemplateList() {
	const { templates, selectedTemplate, actions } = useTemplate();

	const handleCreateTemplate = async () => {
		const name = "New Template";
		await actions.createTemplate(name, []);
	};

	const handleSelectTemplate = (template: Template) => {
		actions.selectTemplate(template);
	};

	return (
		<div className="template-list">
			<div className="template-list-header">
				<h2>Templates</h2>
				<button
					onClick={handleCreateTemplate}
					className="template-create-button"
				>
					New Template
				</button>
			</div>
			<div className="template-list-content">
				{templates.map((template) => (
					<div
						key={template.id}
						className={`template-list-item ${
							selectedTemplate?.id === template.id
								? "selected"
								: ""
						}`}
						onClick={() => handleSelectTemplate(template)}
					>
						<div className="template-list-item-header">
							<span className="template-name">
								{template.name}
							</span>
							<span className="template-instances-count">
								{template.instances.length} instances
							</span>
						</div>
						<div className="template-metadata">
							<span className="template-status">
								{template.metadata.status}
							</span>
							{template.metadata.tags?.map((tag) => (
								<span key={tag} className="template-tag">
									{tag}
								</span>
							))}
						</div>
						<div className="template-description">
							{template.description || "No description"}
						</div>
					</div>
				))}
				{templates.length === 0 && (
					<div className="template-list-empty">
						No templates yet. Create one to get started!
					</div>
				)}
			</div>
		</div>
	);
}
