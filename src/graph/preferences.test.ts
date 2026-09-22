import { describe, expect, it } from "vitest";
import { clonePreferences, DEFAULT_FLOW_PREFERENCES } from "./preferences";

describe("clonePreferences", () => {
	it("deep-clones linkDistance and drawKinds so mutating the clone leaves the original untouched", () => {
		const clone = clonePreferences(DEFAULT_FLOW_PREFERENCES);
		clone.linkDistance.dependency = 999;
		clone.drawKinds.mention = false;

		expect(DEFAULT_FLOW_PREFERENCES.linkDistance.dependency).not.toBe(999);
		expect(DEFAULT_FLOW_PREFERENCES.drawKinds.mention).toBe(true);
	});

	it("copies every top-level field", () => {
		const clone = clonePreferences(DEFAULT_FLOW_PREFERENCES);
		expect(clone).toEqual(DEFAULT_FLOW_PREFERENCES);
		expect(clone).not.toBe(DEFAULT_FLOW_PREFERENCES);
	});
});
