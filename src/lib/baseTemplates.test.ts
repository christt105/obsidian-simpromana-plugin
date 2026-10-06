import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEFAULT_SETTINGS, type SimpromanaSettings } from "../defaults";
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
	...DEFAULT_SETTINGS,
	rootFolder: "Atlas/PM",
	tasksFolder: "Todo",
	referencesFolder: "Refs",
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

describe("templates with renamed properties", () => {
	const renamed: SimpromanaSettings = {
		...settings,
		taskStatusProperty: "status",
		projectProperty: "parent",
	};

	it("groups the task kanban views by the configured status property", () => {
		const base = parse(tasksBaseContent(renamed)) as BaseFile;
		expect(view(base, "Current").groupBy?.property).toBe("status");
		expect(view(base, "Table").groupBy?.property).toBe("parent");
	});

	it("scopes references with the configured project property", () => {
		const base = parse(referencesBaseContent(renamed)) as BaseFile;
		expect(view(base, "Current").filters?.and).toEqual(["note.parent == this"]);
	});
});

describe("templates with a custom status vocabulary", () => {
	const custom: SimpromanaSettings = { ...settings, taskStatuses: "Pendiente, En curso, Hecho" };

	it("uses the configured statuses as board columns", () => {
		const base = parse(tasksBaseContent(custom)) as BaseFile;
		expect(view(base, "Current").boardColumns).toEqual(["Pendiente", "En curso", "Hecho"]);
	});

	it("orders the table by the configured statuses", () => {
		const base = parse(tasksBaseContent(custom)) as { formulas: Record<string, string> };
		expect(base.formulas._status_order).toBe(
			'if(tstatus == "Pendiente", 1, if(tstatus == "En curso", 2, if(tstatus == "Hecho", 3, 4)))'
		);
	});
});
