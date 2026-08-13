import { App, TFile } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import type { TaskRecord } from "../graph/model";
import type { LinkResolver } from "../graph/build";
import { parseLinkTarget } from "../graph/relations";
import { projectsPath, tasksPath } from "./vault";

const ID_PATTERN = /^(.*?)\s+-\s+([A-Za-z0-9]+)$/;

function splitBasename(basename: string): { title: string; id: string } {
	const match = basename.match(ID_PATTERN);
	return match ? { title: match[1], id: match[2] } : { title: basename, id: "" };
}

function stringValue(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export function collectTaskRecords(app: App, settings: SimpromanaSettings): TaskRecord[] {
	const prefix = `${tasksPath(settings)}/`;
	const records: TaskRecord[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (!file.path.startsWith(prefix)) continue;

		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const { title, id } = splitBasename(file.basename);
		const projectTarget = parseLinkTarget(frontmatter.project);
		const projectFile = projectTarget
			? app.metadataCache.getFirstLinkpathDest(projectTarget, file.path)
			: null;

		records.push({
			path: file.path,
			basename: file.basename,
			title,
			id,
			projectPath: projectFile?.path ?? null,
			projectName: projectFile?.basename ?? projectTarget?.split("/").pop() ?? null,
			status: stringValue(frontmatter.tstatus) || "Todo",
			priority: stringValue(frontmatter.priority),
			milestone: stringValue(frontmatter.milestone) || null,
			frontmatter,
		});
	}

	return records;
}

export function createTaskResolver(app: App, records: TaskRecord[]): LinkResolver {
	const byBasename = new Map<string, string>();
	const byId = new Map<string, string>();

	for (const record of records) {
		if (!byBasename.has(record.basename)) byBasename.set(record.basename, record.path);
		if (record.id && !byId.has(record.id)) byId.set(record.id, record.path);
	}

	return (target: string, sourcePath: string): string | null => {
		const resolved = app.metadataCache.getFirstLinkpathDest(target, sourcePath);
		if (resolved) return resolved.path;

		const tail = target.split("/").pop() ?? target;
		return byBasename.get(tail) ?? byId.get(tail) ?? null;
	};
}

export function projectFiles(app: App, settings: SimpromanaSettings): TFile[] {
	const prefix = `${projectsPath(settings)}/`;
	return app.vault
		.getMarkdownFiles()
		.filter((file) => file.path.startsWith(prefix))
		.sort((a, b) => a.basename.localeCompare(b.basename));
}
