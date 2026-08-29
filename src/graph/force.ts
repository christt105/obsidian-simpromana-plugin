import type { NoteRelation, RelationKind } from "./model";
import type { GraphLayout } from "./layout";

export interface ForceNode {
	path: string;
	x: number;
	y: number;
	vx: number;
	vy: number;
	width: number;
	height: number;
	anchorX: number | null;
	fixed: boolean;
}

interface ForceLink {
	source: ForceNode;
	target: ForceNode;
	distance: number;
}

export interface ForceOptions {
	charge: number;
	linkStrength: number;
	anchorStrength: number;
	centreStrength: number;
	velocityDecay: number;
	alphaDecay: number;
	alphaMin: number;
	padding: number;
	maxVelocity: number;
	linkDistance: Record<RelationKind, number>;
}

export const DEFAULT_LINK_DISTANCE: Record<RelationKind, number> = {
	dependency: 280,
	continuation: 260,
	related: 320,
	mention: 360,
};

export const DEFAULT_FORCE_OPTIONS: ForceOptions = {
	charge: -1400,
	linkStrength: 0.12,
	anchorStrength: 0.06,
	centreStrength: 0.04,
	velocityDecay: 0.62,
	alphaDecay: 0.022,
	alphaMin: 0.008,
	padding: 26,
	maxVelocity: 60,
	linkDistance: DEFAULT_LINK_DISTANCE,
};

const COLLISION_PASSES = 4;

export class ForceSimulation {
	readonly nodes: ForceNode[] = [];
	private index = new Map<string, ForceNode>();
	private links: ForceLink[] = [];
	private alpha = 1;
	private centre = { x: 0, y: 0 };

	constructor(
		layout: GraphLayout,
		relations: NoteRelation[],
		private options: ForceOptions = DEFAULT_FORCE_OPTIONS
	) {
		for (const node of layout.nodes) {
			const entry: ForceNode = {
				path: node.record.path,
				x: node.x + node.width / 2,
				y: node.y + node.height / 2,
				vx: 0,
				vy: 0,
				width: node.width,
				height: node.height,
				anchorX: node.unlinked ? null : node.x + node.width / 2,
				fixed: false,
			};
			this.nodes.push(entry);
			this.index.set(entry.path, entry);
		}

		for (const relation of relations) {
			const source = this.index.get(relation.from);
			const target = this.index.get(relation.to);
			if (!source || !target) continue;
			this.links.push({ source, target, distance: this.options.linkDistance[relation.kind] });
		}

		if (this.nodes.length > 0) {
			this.centre = {
				x: this.nodes.reduce((sum, node) => sum + node.x, 0) / this.nodes.length,
				y: this.nodes.reduce((sum, node) => sum + node.y, 0) / this.nodes.length,
			};
		}
	}

	get running(): boolean {
		return this.alpha > this.options.alphaMin;
	}

	get(path: string): ForceNode | undefined {
		return this.index.get(path);
	}

	reheat(alpha = 0.5): void {
		this.alpha = Math.max(this.alpha, alpha);
	}

	setAlpha(alpha: number): void {
		this.alpha = alpha;
	}

	pin(path: string, x: number, y: number): void {
		const node = this.index.get(path);
		if (!node) return;
		node.fixed = true;
		node.x = x;
		node.y = y;
		node.vx = 0;
		node.vy = 0;
	}

	unpinAll(): void {
		for (const node of this.nodes) node.fixed = false;
		this.reheat(0.6);
	}

	get pinnedCount(): number {
		return this.nodes.filter((node) => node.fixed).length;
	}

	tick(): void {
		if (!this.running) return;
		this.alpha *= 1 - this.options.alphaDecay;

		this.applyLinks();
		this.applyCharge();
		this.applyAnchors();
		this.integrate();
		this.resolveCollisions();
		this.recentre();
	}

	private applyLinks(): void {
		const strength = this.options.linkStrength * this.alpha;
		for (const link of this.links) {
			const dx = link.target.x - link.source.x;
			const dy = link.target.y - link.source.y;
			const spread = Math.max(1, Math.hypot(dx, dy));
			const push = ((spread - link.distance) / spread) * strength;
			const fx = dx * push;
			const fy = dy * push;
			link.source.vx += fx;
			link.source.vy += fy;
			link.target.vx -= fx;
			link.target.vy -= fy;
		}
	}

	private applyCharge(): void {
		const charge = this.options.charge * this.alpha;
		for (let i = 0; i < this.nodes.length; i++) {
			const a = this.nodes[i];
			for (let j = i + 1; j < this.nodes.length; j++) {
				const b = this.nodes[j];
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				let squared = dx * dx + dy * dy;
				if (squared < 1) {
					dx = (i % 7) - 3;
					dy = (j % 7) - 3;
					squared = Math.max(1, dx * dx + dy * dy);
				}
				const distance = Math.sqrt(squared);
				const magnitude = charge / Math.max(squared, 400);
				const fx = (dx / distance) * magnitude;
				const fy = (dy / distance) * magnitude;
				a.vx += fx;
				a.vy += fy;
				b.vx -= fx;
				b.vy -= fy;
			}
		}
	}

	private applyAnchors(): void {
		const anchor = this.options.anchorStrength * this.alpha;
		for (const node of this.nodes) {
			if (node.anchorX === null) continue;
			node.vx += (node.anchorX - node.x) * anchor;
		}
	}

	private integrate(): void {
		const { velocityDecay, maxVelocity } = this.options;
		for (const node of this.nodes) {
			if (node.fixed) {
				node.vx = 0;
				node.vy = 0;
				continue;
			}
			node.vx = Math.max(-maxVelocity, Math.min(maxVelocity, node.vx * velocityDecay));
			node.vy = Math.max(-maxVelocity, Math.min(maxVelocity, node.vy * velocityDecay));
			node.x += node.vx;
			node.y += node.vy;
		}
	}

	private resolveCollisions(): void {
		const padding = this.options.padding;
		for (let pass = 0; pass < COLLISION_PASSES; pass++) {
			let separated = 0;
			for (let i = 0; i < this.nodes.length; i++) {
				const a = this.nodes[i];
				for (let j = i + 1; j < this.nodes.length; j++) {
					const b = this.nodes[j];
					const dx = b.x - a.x;
					const dy = b.y - a.y;
					const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
					const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
					if (overlapX <= 0 || overlapY <= 0) continue;
					separated++;

					const movable = (a.fixed ? 0 : 1) + (b.fixed ? 0 : 1);
					if (movable === 0) continue;

					const horizontal = overlapX < overlapY;
					const overlap = horizontal ? overlapX : overlapY;
					const direction = (horizontal ? dx : dy) >= 0 ? 1 : -1;
					const shift = (overlap * direction) / movable;

					if (horizontal) {
						if (!a.fixed) a.x -= shift;
						if (!b.fixed) b.x += shift;
					} else {
						if (!a.fixed) a.y -= shift;
						if (!b.fixed) b.y += shift;
					}
				}
			}
			if (separated === 0) return;
		}
	}

	private recentre(): void {
		if (this.nodes.length === 0) return;
		let sumX = 0;
		let sumY = 0;
		for (const node of this.nodes) {
			sumX += node.x;
			sumY += node.y;
		}
		const shiftX = (this.centre.x - sumX / this.nodes.length) * this.options.centreStrength;
		const shiftY = (this.centre.y - sumY / this.nodes.length) * this.options.centreStrength;
		for (const node of this.nodes) {
			if (node.fixed) continue;
			node.x += shiftX;
			node.y += shiftY;
		}
	}

	bounds(): { x: number; y: number; width: number; height: number } {
		if (this.nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const node of this.nodes) {
			minX = Math.min(minX, node.x - node.width / 2);
			minY = Math.min(minY, node.y - node.height / 2);
			maxX = Math.max(maxX, node.x + node.width / 2);
			maxY = Math.max(maxY, node.y + node.height / 2);
		}
		return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
	}
}
