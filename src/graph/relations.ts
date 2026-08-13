import type { RelationKind } from "./model";

interface RelationKey {
	kind: RelationKind;
	/** The declared target comes before the declaring task. */
	inverted: boolean;
}

const RELATION_KEYS: Record<string, RelationKey> = {
	blocks: { kind: "dependency", inverted: false },
	blocking: { kind: "dependency", inverted: false },
	blockedby: { kind: "dependency", inverted: true },
	dependson: { kind: "dependency", inverted: true },
	continuedby: { kind: "continuation", inverted: false },
	followedby: { kind: "continuation", inverted: false },
	continues: { kind: "continuation", inverted: true },
	follows: { kind: "continuation", inverted: true },
	related: { kind: "related", inverted: false },
	relatedto: { kind: "related", inverted: false },
};

export const CANONICAL_RELATION_KEYS: Record<RelationKind, string> = {
	dependency: "blocked_by",
	continuation: "continues",
	related: "related",
};

export const RELATION_LABELS: Record<RelationKind, string> = {
	dependency: "Blocks",
	continuation: "Continues",
	related: "Related",
};

function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[\s_-]/g, "");
}

export function relationKeyOf(key: string): RelationKey | null {
	return RELATION_KEYS[normalizeKey(key)] ?? null;
}

export function parseLinkTarget(raw: unknown): string | null {
	if (typeof raw !== "string") {
		if (raw && typeof raw === "object" && "path" in raw) {
			return parseLinkTarget((raw as { path: unknown }).path);
		}
		return null;
	}
	const match = raw.trim().match(/^\[\[(.*)\]\]$/);
	const inner = (match ? match[1] : raw).trim();
	const target = inner.split("|")[0].split("#")[0].trim();
	return target.length > 0 ? target : null;
}

export function toTargetList(value: unknown): string[] {
	if (value === null || value === undefined) return [];
	const values = Array.isArray(value) ? value : [value];
	return values
		.map(parseLinkTarget)
		.filter((target): target is string => target !== null);
}
