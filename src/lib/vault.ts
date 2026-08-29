import { App, ItemView, normalizePath, TFile, TFolder } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import { parseLinkTarget } from "../graph/relations";
import { FLOW_VIEW_TYPE } from "../views/constants";

export function projectsPath(s: SimpromanaSettings): string {
	return normalizePath(`${s.rootFolder}/${s.projectsFolder}`);
}

export function tasksPath(s: SimpromanaSettings): string {
	return normalizePath(`${s.rootFolder}/${s.tasksFolder}`);
}

export function referencesPath(s: SimpromanaSettings): string {
	return normalizePath(`${s.rootFolder}/${s.referencesFolder}`);
}

export function archivePath(s: SimpromanaSettings): string {
	return normalizePath(`${s.rootFolder}/${s.archiveFolder}`);
}

export function generateId(length = 6): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function ensureFolder(app: App, path: string): Promise<void> {
	const normalized = normalizePath(path);
	if (!app.vault.getAbstractFileByPath(normalized)) {
		await app.vault.createFolder(normalized);
	}
}

export async function getAllProjects(app: App, s: SimpromanaSettings): Promise<TFile[]> {
	const folder = app.vault.getAbstractFileByPath(projectsPath(s));
	if (!(folder instanceof TFolder)) return [];
	return folder.children
		.filter((f): f is TFile => f instanceof TFile && f.extension === "md")
		.sort((a, b) => a.basename.localeCompare(b.basename));
}

/**
 * Prefers the project the active *view* is scoped to (an open task's own
 * project, or the flow view's selected project) over blindly reading the
 * active file, since neither of those is a project note itself.
 */
export function activeProjectFile(app: App, s: SimpromanaSettings): TFile | null {
	const flowView = app.workspace.getActiveViewOfType(ItemView);
	if (flowView?.getViewType() === FLOW_VIEW_TYPE) {
		const state = flowView.getState() as { projectPath?: unknown };
		if (typeof state.projectPath === "string") {
			const file = app.vault.getAbstractFileByPath(state.projectPath);
			if (file instanceof TFile) return file;
		}
	}

	const active = app.workspace.getActiveFile();
	if (!active) return null;
	const fm = app.metadataCache.getFileCache(active)?.frontmatter;
	if (fm?.type === "project" && active.path.startsWith(projectsPath(s))) {
		return active;
	}
	if (fm?.type === "task") {
		const projectTarget = parseLinkTarget(fm.project);
		const projectFile = projectTarget
			? app.metadataCache.getFirstLinkpathDest(projectTarget, active.path)
			: null;
		if (projectFile) return projectFile;
	}
	return null;
}

export function projectWikilink(s: SimpromanaSettings, basename: string): string {
	return `"[[${s.rootFolder}/${s.projectsFolder}/${basename}]]"`;
}
