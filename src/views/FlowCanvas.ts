import { setTooltip } from "obsidian";
import type { GraphLayout, LayoutEdge, LayoutGroup, LayoutNode } from "../graph/layout";
import { CanvasGestures } from "./CanvasGestures";
import type { Point, Transform } from "./CanvasGestures";

const SVG_NS = "http://www.w3.org/2000/svg";
const FIT_PADDING = 32;

interface HitArea {
	path: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface CanvasHandlers {
	onOpenTask(path: string, event: PointerEvent): void;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attributes: Record<string, string> = {}
): SVGElementTagNameMap[K] {
	const element = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	return element;
}

function curveBetween(from: Point, to: Point): string {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	if (Math.abs(dx) >= Math.abs(dy)) {
		const offset = Math.max(20, Math.abs(dx) * 0.4);
		const direction = dx >= 0 ? 1 : -1;
		return `M ${from.x} ${from.y} C ${from.x + offset * direction} ${from.y}, ${to.x - offset * direction} ${to.y}, ${to.x} ${to.y}`;
	}
	const offset = Math.max(20, Math.abs(dy) * 0.4);
	const direction = dy >= 0 ? 1 : -1;
	return `M ${from.x} ${from.y} C ${from.x} ${from.y + offset * direction}, ${to.x} ${to.y - offset * direction}, ${to.x} ${to.y}`;
}

function isUndirected(edge: LayoutEdge): boolean {
	return edge.relation.kind === "related" || edge.relation.kind === "mention";
}

function edgePath(edge: LayoutEdge): string {
	const points = edge.points;
	if (points.length < 2) return "";
	if (isUndirected(edge)) return curveBetween(points[0], points[1]);

	const direction = edge.cyclic ? -1 : 1;
	let path = `M ${points[0].x} ${points[0].y}`;
	for (let index = 1; index < points.length; index++) {
		const from = points[index - 1];
		const to = points[index];
		const offset = Math.max(24, Math.abs(to.x - from.x) * 0.45);
		path += ` C ${from.x + offset * direction} ${from.y}, ${to.x - offset * direction} ${to.y}, ${to.x} ${to.y}`;
	}
	return path;
}

function statusSlug(status: string): string {
	return status.toLowerCase().replace(/\s+/g, "-");
}

export class FlowCanvas {
	private svg: SVGSVGElement;
	private viewport: SVGGElement;
	private edgeLayer: SVGGElement;
	private nodeLayer: SVGGElement;
	private gestures: CanvasGestures;
	private layout: GraphLayout | null = null;
	private nodeElements = new Map<string, SVGGElement>();
	private edgeElements: { element: SVGPathElement; from: string; to: string }[] = [];
	private neighbours = new Map<string, Set<string>>();
	private hitAreas: HitArea[] = [];
	private hovered: string | null = null;
	private pendingFit = false;
	private observer: ResizeObserver;

	constructor(private container: HTMLElement, private handlers: CanvasHandlers) {
		this.svg = svgEl("svg", { class: "spm-flow-svg" });
		this.svg.appendChild(this.buildDefs());

		this.viewport = svgEl("g", { class: "spm-flow-viewport" });
		this.edgeLayer = svgEl("g", { class: "spm-flow-edges" });
		this.nodeLayer = svgEl("g", { class: "spm-flow-nodes" });
		this.viewport.appendChild(this.edgeLayer);
		this.viewport.appendChild(this.nodeLayer);
		this.svg.appendChild(this.viewport);
		this.container.appendChild(this.svg);

		this.gestures = new CanvasGestures(this.svg, {
			onTransform: (transform) => this.applyTransform(transform),
			onTap: (point, event) => this.onTap(point, event),
			onHover: (point) => this.onHover(point),
			onGesture: (active) => this.svg.toggleClass("is-panning", active),
			onDoubleClick: (point) => this.onDoubleClick(point),
		});

		this.observer = new ResizeObserver(() => {
			this.gestures.invalidateBounds();
			if (this.pendingFit) this.fit(false);
		});
		this.observer.observe(this.container);
	}

	destroy(): void {
		this.observer.disconnect();
		this.gestures.destroy();
		this.svg.remove();
	}

	render(layout: GraphLayout, options: { fit: boolean }): void {
		this.layout = layout;
		this.edgeLayer.empty();
		this.edgeElements = [];
		this.neighbours.clear();
		this.hitAreas = [];
		this.hovered = null;

		if (layout.unlinkedTop !== null) {
			this.edgeLayer.appendChild(this.buildUnlinkedDivider(layout));
		}
		for (const group of layout.groups) {
			this.edgeLayer.appendChild(this.buildGroupHeader(group));
		}
		for (const edge of layout.edges) {
			this.edgeLayer.appendChild(this.buildEdge(edge));
			this.link(edge.relation.from, edge.relation.to);
		}

		const previous = this.nodeElements;
		this.nodeElements = new Map();
		for (const node of layout.nodes) {
			this.nodeElements.set(node.record.path, this.renderNode(node, previous));
			this.hitAreas.push({
				path: node.record.path,
				x: node.x,
				y: node.y,
				width: node.width,
				height: node.height,
			});
		}
		for (const orphan of previous.values()) orphan.remove();

		if (options.fit) this.fit(false);
	}

	fit(animate = true): void {
		const layout = this.layout;
		if (!layout || layout.nodes.length === 0) return;

		const bounds = this.container.getBoundingClientRect();
		if (bounds.width < 50 || bounds.height < 50) {
			this.pendingFit = true;
			return;
		}

		this.pendingFit = false;
		this.gestures.fit(layout.width, layout.height, FIT_PADDING, animate);
	}

	zoomBy(factor: number): void {
		this.gestures.zoomBy(factor);
	}

	private applyTransform(transform: Transform): void {
		this.viewport.setAttribute(
			"transform",
			`translate(${transform.x} ${transform.y}) scale(${transform.k})`
		);
	}

	private hitTest(point: Point): string | null {
		for (let index = this.hitAreas.length - 1; index >= 0; index--) {
			const area = this.hitAreas[index];
			if (
				point.x >= area.x &&
				point.x <= area.x + area.width &&
				point.y >= area.y &&
				point.y <= area.y + area.height
			) {
				return area.path;
			}
		}
		return null;
	}

	private onTap(point: Point, event: PointerEvent): void {
		const path = this.hitTest(point);
		if (path) this.handlers.onOpenTask(path, event);
	}

	private onHover(point: Point | null): void {
		const path = point ? this.hitTest(point) : null;
		if (path === this.hovered) return;
		this.hovered = path;
		if (path) this.highlight(path);
		else this.clearHighlight();
	}

	private onDoubleClick(point: Point): void {
		if (this.hitTest(point)) return;
		this.gestures.zoomBy(1.6);
	}

	private buildDefs(): SVGDefsElement {
		const defs = svgEl("defs");
		for (const kind of ["dependency", "continuation", "cycle"]) {
			const marker = svgEl("marker", {
				id: `spm-arrow-${kind}`,
				viewBox: "0 0 10 10",
				refX: "9",
				refY: "5",
				markerWidth: "6",
				markerHeight: "6",
				orient: "auto-start-reverse",
			});
			marker.appendChild(
				svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", class: `spm-flow-arrow is-${kind}` })
			);
			defs.appendChild(marker);
		}
		return defs;
	}

	private buildUnlinkedDivider(layout: GraphLayout): SVGGElement {
		const top = (layout.unlinkedTop as number) - 28;
		const group = svgEl("g", { class: "spm-flow-divider" });
		group.appendChild(
			svgEl("line", {
				x1: "0",
				y1: String(top),
				x2: String(Math.max(layout.width, 200)),
				y2: String(top),
			})
		);
		const label = svgEl("text", { x: "0", y: String(top - 8) });
		label.textContent = "Unlinked tasks";
		group.appendChild(label);
		return group;
	}

	private buildGroupHeader(group: LayoutGroup): SVGGElement {
		const element = svgEl("g", { class: "spm-flow-group" });
		const label = svgEl("text", { x: "2", y: String(group.y + 20) });
		label.textContent = group.label;
		element.appendChild(label);
		element.appendChild(
			svgEl("line", {
				x1: "0",
				y1: String(group.y + 28),
				x2: String(group.width),
				y2: String(group.y + 28),
			})
		);
		return element;
	}

	private buildEdge(edge: LayoutEdge): SVGPathElement {
		const kind = edge.cyclic ? "cycle" : edge.relation.kind;
		const path = svgEl("path", {
			class: `spm-flow-edge is-${kind}`,
			d: edgePath(edge),
		});
		if (!isUndirected(edge)) {
			path.setAttribute("marker-end", `url(#spm-arrow-${kind})`);
		}
		this.edgeElements.push({ element: path, from: edge.relation.from, to: edge.relation.to });
		return path;
	}

	private renderNode(node: LayoutNode, previous: Map<string, SVGGElement>): SVGGElement {
		const record = node.record;
		const existing = previous.get(record.path);
		previous.delete(record.path);

		const group = existing ?? svgEl("g", { class: "spm-flow-node is-entering" });
		group.empty();
		if (!existing) this.nodeLayer.appendChild(group);
		group.setAttribute("transform", `translate(${node.x} ${node.y})`);

		const holder = svgEl("foreignObject", {
			x: "0",
			y: "0",
			width: String(node.width),
			height: String(node.height),
		});

		const card = document.createElement("div");
		card.className = "spm-flow-card";
		card.dataset.status = statusSlug(record.status);
		card.dataset.kind = record.kind;
		if (node.unlinked) card.addClass("is-unlinked");
		if (record.external) card.addClass("is-external");

		const title = card.createDiv({ cls: "spm-flow-card-title", text: record.title });
		title.setAttribute("title", record.title);

		const meta = card.createDiv({ cls: "spm-flow-card-meta" });
		if (record.kind === "reference") {
			meta.createSpan({ cls: "spm-flow-chip is-reference", text: "Reference" });
		} else {
			meta.createSpan({ cls: "spm-flow-chip is-status", text: record.status });
		}
		if (record.priority) {
			meta.createSpan({ cls: `spm-flow-chip is-priority is-${record.priority}`, text: record.priority });
		}
		if (record.milestone) {
			meta.createSpan({ cls: "spm-flow-chip", text: record.milestone });
		}
		if (record.external && record.projectName) {
			meta.createSpan({ cls: "spm-flow-chip", text: record.projectName });
		}

		holder.appendChild(card);
		group.appendChild(holder);
		setTooltip(card, this.tooltipFor(node), { delay: 400 });

		return group;
	}

	private tooltipFor(node: LayoutNode): string {
		const record = node.record;
		const lines = [record.title];
		if (record.kind === "reference") lines.push("Reference note");
		else lines.push(`Status: ${record.status}`);
		if (record.priority) lines.push(`Priority: ${record.priority}`);
		if (record.milestone) lines.push(`Milestone: ${record.milestone}`);
		if (record.projectName) lines.push(`Project: ${record.projectName}`);
		return lines.join("\n");
	}

	private link(from: string, to: string): void {
		const forward = this.neighbours.get(from) ?? new Set<string>();
		forward.add(to);
		this.neighbours.set(from, forward);
		const backward = this.neighbours.get(to) ?? new Set<string>();
		backward.add(from);
		this.neighbours.set(to, backward);
	}

	private highlight(path: string): void {
		const related = this.neighbours.get(path) ?? new Set<string>();

		for (const [nodePath, element] of this.nodeElements) {
			const active = nodePath === path || related.has(nodePath);
			element.toggleClass("is-faded", !active);
			element.toggleClass("is-focus", nodePath === path);
		}
		for (const edge of this.edgeElements) {
			const active = edge.from === path || edge.to === path;
			edge.element.toggleClass("is-faded", !active);
			edge.element.toggleClass("is-active", active);
		}
	}

	private clearHighlight(): void {
		for (const element of this.nodeElements.values()) {
			element.removeClass("is-faded");
			element.removeClass("is-focus");
		}
		for (const edge of this.edgeElements) {
			edge.element.removeClass("is-faded");
			edge.element.removeClass("is-active");
		}
	}
}
