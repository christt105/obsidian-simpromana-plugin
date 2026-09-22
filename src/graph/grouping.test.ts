import { describe, expect, it } from "vitest";
import type { NoteRecord } from "./model";
import { compareGroups, grouperFor } from "./grouping";

function note(overrides: Partial<NoteRecord> = {}): NoteRecord {
	return {
		kind: "task",
		path: "A",
		basename: "A",
		title: "A",
		id: "",
		projectPath: null,
		projectName: null,
		status: "Todo",
		priority: "medium",
		milestone: null,
		epic: null,
		frontmatter: {},
		links: [],
		...overrides,
	};
}

describe("grouperFor", () => {
	it("groups by status, ranking Todo/Doing/Review/Done in order", () => {
		const grouper = grouperFor("status");
		expect(grouper(note({ status: "Doing" })).rank).toBeLessThan(
			grouper(note({ status: "Review" })).rank
		);
		expect(grouper(note({ status: "Todo" })).rank).toBe(0);
	});

	it("is case-insensitive for status", () => {
		const grouper = grouperFor("status");
		expect(grouper(note({ status: "done" })).rank).toBe(grouper(note({ status: "Done" })).rank);
	});

	it("groups by priority, ranking high/medium/low in order", () => {
		const grouper = grouperFor("priority");
		expect(grouper(note({ priority: "high" })).rank).toBeLessThan(
			grouper(note({ priority: "low" })).rank
		);
	});

	it("groups tasks without a milestone together, ranked after those with one", () => {
		const grouper = grouperFor("milestone");
		expect(grouper(note({ milestone: "v1" })).rank).toBe(0);
		expect(grouper(note({ milestone: null })).rank).toBe(1);
		expect(grouper(note({ milestone: null })).label).toBe("No milestone");
	});

	it("always buckets reference notes into their own group, whatever the mode", () => {
		const grouper = grouperFor("status");
		const group = grouper(note({ kind: "reference" }));
		expect(group.key).toBe("reference");
		expect(group.label).toBe("Reference notes");
	});

	it("collapses everything into one empty group when mode is none", () => {
		const grouper = grouperFor("none");
		expect(grouper(note({ status: "Doing" }))).toEqual({ key: "", label: "", rank: 0 });
		expect(grouper(note({ kind: "reference" }))).toEqual({ key: "", label: "", rank: 0 });
	});
});

describe("compareGroups", () => {
	it("orders by rank first", () => {
		expect(compareGroups({ key: "a", label: "Z", rank: 0 }, { key: "b", label: "A", rank: 1 })).toBeLessThan(0);
	});

	it("falls back to a numeric-aware label comparison within the same rank", () => {
		expect(
			compareGroups({ key: "a", label: "Task 2", rank: 0 }, { key: "b", label: "Task 10", rank: 0 })
		).toBeLessThan(0);
	});
});
