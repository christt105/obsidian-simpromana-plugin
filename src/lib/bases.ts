import { App, normalizePath } from "obsidian";
import type { SimpromanaSettings } from "../settings";
import { referencesBaseContent, tasksBaseContent } from "./baseTemplates";

/** Creates the missing `.base` files and returns the paths it created; existing files are left untouched. */
export async function setupBases(app: App, s: SimpromanaSettings): Promise<string[]> {
	const bases: [string, string][] = [
		[normalizePath(`${s.rootFolder}/Tasks.base`), tasksBaseContent(s)],
		[normalizePath(`${s.rootFolder}/References.base`), referencesBaseContent(s)],
	];
	const created: string[] = [];
	for (const [path, content] of bases) {
		if (app.vault.getAbstractFileByPath(path)) continue;
		await app.vault.create(path, content);
		created.push(path);
	}
	return created;
}
