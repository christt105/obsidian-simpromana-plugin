import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import type { SimpromanaSettings } from "../settings";
import { referencesBaseContent, tasksBaseContent } from "./baseTemplates";

interface BaseView {
	type: string;
	name: string;
	filters?: { and: string[] };
	groupBy?: { property: string };
	boardColumns?: string[];
}

interface BaseFile {
	filters: { and: string[] };
	views: BaseView[];
}

const settings: SimpromanaSettings = {
	rootFolder: "Atlas/PM",
	projectsFolder: "Projects",
	tasksFolder: "Todo",
	referencesFolder: "Refs",
	archiveFolder: "Archive",
};

function view(base: BaseFile, name: string): BaseView {
	const found = base.views.find((v) => v.name === name);
	if (!found) throw new Error(`missing view ${name}`);
	return found;
}

describe("tasksBaseContent", () => {
	const base = parse(tasksBaseContent(settings)) as BaseFile;

	it("filters to the configured tasks folder", () => {
		expect(base.filters.and).toEqual(['file.folder == "Atlas/PM/Todo"']);
	});

	it("renders the Current and Board views with Base Board's kanban type", () => {
		for (const name of ["Current", "Board"]) {
			const v = view(base, name);
			expect(v.type).toBe("kanban");
			expect(v.groupBy?.property).toBe("tstatus");
			expect(v.boardColumns).toEqual(["Todo", "Doing", "Review", "Done"]);
		}
	});

	it("scopes the Current view to tasks linking the embedding note", () => {
		expect(view(base, "Current").filters?.and).toEqual(["file.hasLink(this)"]);
	});
});

describe("referencesBaseContent", () => {
	const base = parse(referencesBaseContent(settings)) as BaseFile;

	it("filters to the configured references folder", () => {
		expect(base.filters.and).toEqual(['file.folder == "Atlas/PM/Refs"']);
	});

	it("scopes the Current view to references of the embedding project", () => {
		expect(view(base, "Current").filters?.and).toEqual(["note.project == this"]);
	});

	it("groups the All view by project", () => {
		expect(view(base, "All").groupBy?.property).toBe("project");
	});
});
