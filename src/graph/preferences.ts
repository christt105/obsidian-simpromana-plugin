import type { RelationKind } from "./model";
import type { GroupingMode } from "./grouping";
import { DEFAULT_LAYOUT_OPTIONS } from "./layout";
import { DEFAULT_FORCE_OPTIONS, DEFAULT_LINK_DISTANCE } from "./force";

export const DRAWABLE_KINDS: RelationKind[] = ["dependency", "continuation", "related", "mention"];

export interface FlowGraphPreferences {
	nodeWidth: number;
	nodeHeight: number;
	layerGap: number;
	rowGap: number;
	charge: number;
	collisionPadding: number;
	alphaDecay: number;
	linkDistance: Record<RelationKind, number>;
	hubLimit: number;
	drawKinds: Record<RelationKind, boolean>;
	grouping: GroupingMode;
}

export const DEFAULT_FLOW_PREFERENCES: FlowGraphPreferences = {
	nodeWidth: DEFAULT_LAYOUT_OPTIONS.nodeWidth,
	nodeHeight: DEFAULT_LAYOUT_OPTIONS.nodeHeight,
	layerGap: DEFAULT_LAYOUT_OPTIONS.layerGap,
	rowGap: DEFAULT_LAYOUT_OPTIONS.rowGap,
	charge: DEFAULT_FORCE_OPTIONS.charge,
	collisionPadding: DEFAULT_FORCE_OPTIONS.padding,
	alphaDecay: DEFAULT_FORCE_OPTIONS.alphaDecay,
	linkDistance: { ...DEFAULT_LINK_DISTANCE },
	hubLimit: 12,
	drawKinds: { dependency: true, continuation: true, related: true, mention: true },
	grouping: "status",
};

export function clonePreferences(preferences: FlowGraphPreferences): FlowGraphPreferences {
	return {
		...preferences,
		linkDistance: { ...preferences.linkDistance },
		drawKinds: { ...preferences.drawKinds },
	};
}
