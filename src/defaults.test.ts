import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, doneStatus, projectStatusList, taskStatusList } from "./defaults";

describe("status lists", () => {
	it("splits and trims the comma-separated settings", () => {
		const s = { ...DEFAULT_SETTINGS, taskStatuses: " Pendiente ,En curso,, Hecho " };
		expect(taskStatusList(s)).toEqual(["Pendiente", "En curso", "Hecho"]);
		expect(doneStatus(s)).toBe("Hecho");
	});

	it("falls back to the defaults when a list is empty", () => {
		const s = { ...DEFAULT_SETTINGS, taskStatuses: " , ", projectStatuses: "" };
		expect(taskStatusList(s)).toEqual(["Todo", "Doing", "Review", "Done"]);
		expect(projectStatusList(s)[0]).toBe("Backlog");
	});
});
