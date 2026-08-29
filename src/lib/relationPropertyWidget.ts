import { App, PropertyRenderContext, PropertyWidget, PropertyWidgetComponentBase, TFile, setIcon } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import { parseLinkTarget } from "../graph/relations";
import { wikilink } from "./relations";
import { collectNotes } from "./notes";
import { TaskSearchModal } from "../modals/TaskSearchModal";

export const RELATION_WIDGET_TYPE = "simpromana-relation";

/** Frontmatter keys this plugin renders as a task searcher instead of plain text. */
export const RELATION_PROPERTY_KEYS = ["blocked_by", "blocks", "continues", "continued_by", "related"];

function toValueArray(data: unknown): string[] {
	if (data === null || data === undefined) return [];
	const values = Array.isArray(data) ? data : [data];
	return values.filter((value): value is string => typeof value === "string");
}

function isValidRelationValue(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	const values = Array.isArray(value) ? value : [value];
	return values.every((entry) => typeof entry === "string");
}

function resolveTarget(app: App, raw: string, sourcePath: string): TFile | null {
	const target = parseLinkTarget(raw);
	if (!target) return null;
	return app.metadataCache.getFirstLinkpathDest(target, sourcePath);
}

function relationCandidates(
	app: App,
	settings: SimpromanaSettings,
	sourcePath: string,
	currentValues: string[]
): TFile[] {
	const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
	if (!(sourceFile instanceof TFile)) return [];

	const frontmatter = app.metadataCache.getFileCache(sourceFile)?.frontmatter;
	const projectTarget = parseLinkTarget(frontmatter?.project);
	const projectFile = projectTarget
		? app.metadataCache.getFirstLinkpathDest(projectTarget, sourcePath)
		: null;

	const excluded = new Set<string>([sourceFile.path]);
	for (const raw of currentValues) {
		const resolved = resolveTarget(app, raw, sourcePath);
		if (resolved) excluded.add(resolved.path);
	}

	return collectNotes(app, settings, { references: false })
		.filter((record) => record.kind === "task")
		.filter((record) => !projectFile || record.projectPath === projectFile.path)
		.filter((record) => !excluded.has(record.path))
		.map((record) => app.vault.getAbstractFileByPath(record.path))
		.filter((file): file is TFile => file instanceof TFile)
		.sort((a, b) => a.basename.localeCompare(b.basename));
}

class RelationPropertyWidgetComponent implements PropertyWidgetComponentBase {
	type = RELATION_WIDGET_TYPE;
	private values: string[];
	private addButtonEl: HTMLElement | null = null;

	constructor(
		private app: App,
		private settings: SimpromanaSettings,
		private containerEl: HTMLElement,
		data: unknown,
		private context: PropertyRenderContext
	) {
		this.values = toValueArray(data);
		this.draw();
	}

	focus(): void {
		this.addButtonEl?.focus();
	}

	private draw(): void {
		this.containerEl.empty();
		this.containerEl.addClass("spm-relation-widget");

		for (const [index, raw] of this.values.entries()) {
			this.drawPill(raw, index);
		}

		this.addButtonEl = this.containerEl.createEl("button", {
			cls: "spm-relation-add",
			attr: { type: "button", "aria-label": "Search tasks" },
		});
		setIcon(this.addButtonEl, "plus");
		this.addButtonEl.addEventListener("click", () => this.openSearch());
	}

	private drawPill(raw: string, index: number): void {
		const resolved = resolveTarget(this.app, raw, this.context.sourcePath);
		const label = resolved?.basename ?? parseLinkTarget(raw) ?? raw;

		const pillEl = this.containerEl.createDiv({ cls: "spm-relation-pill" });
		pillEl.createSpan({ cls: "spm-relation-pill-label", text: label });

		const removeEl = pillEl.createDiv({ cls: "spm-relation-pill-remove" });
		setIcon(removeEl, "x");
		removeEl.addEventListener("click", (evt) => {
			evt.stopPropagation();
			this.values.splice(index, 1);
			this.commit();
		});
	}

	private openSearch(): void {
		const candidates = relationCandidates(
			this.app,
			this.settings,
			this.context.sourcePath,
			this.values
		);
		new TaskSearchModal(this.app, candidates, (file) => {
			this.values.push(wikilink(file));
			this.commit();
		}).open();
	}

	private commit(): void {
		this.context.onChange([...this.values]);
		this.draw();
	}
}

export function registerRelationPropertyWidget(app: App, settings: SimpromanaSettings): void {
	const widget: PropertyWidget<RelationPropertyWidgetComponent> = {
		type: RELATION_WIDGET_TYPE,
		icon: "link",
		name: () => "Task relation",
		validate: isValidRelationValue,
		render: (containerEl, data, context) =>
			new RelationPropertyWidgetComponent(app, settings, containerEl, data, context),
	};

	app.metadataTypeManager.registeredTypeWidgets[RELATION_WIDGET_TYPE] = widget;

	for (const key of RELATION_PROPERTY_KEYS) {
		if (app.metadataTypeManager.getAssignedWidget(key) !== RELATION_WIDGET_TYPE) {
			void app.metadataTypeManager.setType(key, RELATION_WIDGET_TYPE);
		}
	}
}
