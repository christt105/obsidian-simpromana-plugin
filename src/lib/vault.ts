import { App, normalizePath, TFile, TFolder } from "obsidian";
import type { SimpromanaSettings } from "../settings";

export function projectsPath(s: SimpromanaSettings): string {
	return normalizePath(`${s.rootFolder}/${s.projectsFolder}`);
}

export function tasksPath(s: SimpromanaSettings): string {
	return normalizePath(`${s.rootFolder}/${s.tasksFolder}`);
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

export function activeProjectFile(app: App, s: SimpromanaSettings): TFile | null {
	const active = app.workspace.getActiveFile();
	if (!active) return null;
	const fm = app.metadataCache.getFileCache(active)?.frontmatter;
	if (fm?.type === "project" && active.path.startsWith(projectsPath(s))) {
		return active;
	}
	return null;
}

export function projectWikilink(s: SimpromanaSettings, basename: string): string {
	return `"[[${s.rootFolder}/${s.projectsFolder}/${basename}]]"`;
}
