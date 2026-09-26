import { describe, expect, it } from "vitest";
import { isOrderingKind } from "./model";

describe("isOrderingKind", () => {
	it("treats dependency and continuation as ordering kinds", () => {
		expect(isOrderingKind("dependency")).toBe(true);
		expect(isOrderingKind("continuation")).toBe(true);
	});

	it("does not treat related or mention as ordering kinds", () => {
		expect(isOrderingKind("related")).toBe(false);
		expect(isOrderingKind("mention")).toBe(false);
	});
});
