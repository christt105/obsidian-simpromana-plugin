import { describe, expect, it } from "vitest";
import { CANONICAL_RELATION_KEYS, parseLinkTarget, relationKeyOf, toTargetList } from "./relations";

describe("relationKeyOf", () => {
	it("resolves every documented alias to its canonical kind", () => {
		expect(relationKeyOf("blocked_by")).toMatchObject({ kind: "dependency", inverted: true });
		expect(relationKeyOf("depends_on")).toMatchObject({ kind: "dependency", inverted: true });
		expect(relationKeyOf("blocks")).toMatchObject({ kind: "dependency", inverted: false });
		expect(relationKeyOf("blocking")).toMatchObject({ kind: "dependency", inverted: false });
		expect(relationKeyOf("continues")).toMatchObject({ kind: "continuation", inverted: true });
		expect(relationKeyOf("follows")).toMatchObject({ kind: "continuation", inverted: true });
		expect(relationKeyOf("continued_by")).toMatchObject({ kind: "continuation", inverted: false });
		expect(relationKeyOf("followed_by")).toMatchObject({ kind: "continuation", inverted: false });
		expect(relationKeyOf("related")).toMatchObject({ kind: "related", inverted: false });
		expect(relationKeyOf("related_to")).toMatchObject({ kind: "related", inverted: false });
	});

	it("normalizes case, spaces, underscores and dashes", () => {
		expect(relationKeyOf("Blocked By")).toMatchObject({ kind: "dependency", inverted: true });
		expect(relationKeyOf("blocked-by")).toMatchObject({ kind: "dependency", inverted: true });
		expect(relationKeyOf("BLOCKED_BY")).toMatchObject({ kind: "dependency", inverted: true });
	});

	it("returns null for keys that aren't a relation", () => {
		expect(relationKeyOf("tstatus")).toBeNull();
		expect(relationKeyOf("project")).toBeNull();
	});
});

describe("CANONICAL_RELATION_KEYS", () => {
	it("maps every ordering/related kind back to a relationKeyOf-recognized key", () => {
		expect(relationKeyOf(CANONICAL_RELATION_KEYS.dependency)?.kind).toBe("dependency");
		expect(relationKeyOf(CANONICAL_RELATION_KEYS.continuation)?.kind).toBe("continuation");
		expect(relationKeyOf(CANONICAL_RELATION_KEYS.related)?.kind).toBe("related");
	});
});

describe("parseLinkTarget", () => {
	it("strips wikilink brackets", () => {
		expect(parseLinkTarget("[[Tasks/Some task - ab12cd]]")).toBe("Tasks/Some task - ab12cd");
	});

	it("strips an alias after |", () => {
		expect(parseLinkTarget("[[Tasks/Some task - ab12cd|Some task]]")).toBe(
			"Tasks/Some task - ab12cd"
		);
	});

	it("strips a heading anchor after #", () => {
		expect(parseLinkTarget("[[Projects/Simpromana#Tareas]]")).toBe("Projects/Simpromana");
	});

	it("accepts a plain path without brackets", () => {
		expect(parseLinkTarget("Projects/Simpromana")).toBe("Projects/Simpromana");
	});

	it("reads the path off a link-like object", () => {
		expect(parseLinkTarget({ path: "Projects/Simpromana.md" })).toBe("Projects/Simpromana.md");
	});

	it("returns null for blank or non-link input", () => {
		expect(parseLinkTarget("")).toBeNull();
		expect(parseLinkTarget("   ")).toBeNull();
		expect(parseLinkTarget(42)).toBeNull();
		expect(parseLinkTarget(null)).toBeNull();
		expect(parseLinkTarget(undefined)).toBeNull();
	});
});

describe("toTargetList", () => {
	it("wraps a single value into a one-item list", () => {
		expect(toTargetList("[[Projects/Simpromana]]")).toEqual(["Projects/Simpromana"]);
	});

	it("passes through an array, dropping unparseable entries", () => {
		expect(toTargetList(["[[A]]", "", "[[B|alias]]"])).toEqual(["A", "B"]);
	});

	it("returns an empty list for null/undefined", () => {
		expect(toTargetList(null)).toEqual([]);
		expect(toTargetList(undefined)).toEqual([]);
	});
});
