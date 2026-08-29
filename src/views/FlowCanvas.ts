import { setTooltip } from "obsidian";
import type { GraphLayout, LayoutEdge, LayoutGroup, LayoutNode } from "../graph/layout";
import type { NoteRelation } from "../graph/model";
import { DEFAULT_FORCE_OPTIONS, ForceSimulation } from "../graph/force";
import type { ForceNode, ForceOptions } from "../graph/force";
import { CanvasGestures } from "./CanvasGestures";
import type { DragPhase, Point, Transform } from "./CanvasGestures";

const SVG_NS = "http://www.w3.org/2000/svg";
const FIT_PADDING = 32;
const EDGE_HIT_TOLERANCE = 8;

export type CanvasMode = "flow" | "force";

interface HitArea {
	path: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface CanvasHandlers {
	onOpenTask(path: string, event: PointerEvent): void;
	onConnect(from: string, to: string, client: Point): void;
	onMenu(path: string | null, client: Point): void;
	onEdgeMenu(relation: NoteRelation, client: Point): void;
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

function borderPoint(node: ForceNode, towards: Point): Point {
	const dx = towards.x - node.x;
	const dy = towards.y - node.y;
	if (dx === 0 && dy === 0) return { x: node.x, y: node.y };

	const scaleX = dx === 0 ? Infinity : node.width / 2 / Math.abs(dx);
	const scaleY = dy === 0 ? Infinity : node.height / 2 / Math.abs(dy);
	const scale = Math.min(scaleX, scaleY);
	return { x: node.x + dx * scale, y: node.y + dy * scale };
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
	private edgeElements: { element: SVGPathElement; relation: NoteRelation }[] = [];
	private neighbours = new Map<string, Set<string>>();
	private hitAreas: HitArea[] = [];
	private hovered: string | null = null;
	private pendingFit = false;
	private observer: ResizeObserver;
	private mode: CanvasMode = "flow";
	private simulation: ForceSimulation | null = null;
	private simulationFrame = 0;
	private forceOptions: ForceOptions = DEFAULT_FORCE_OPTIONS;
	private grabOffset: Point = { x: 0, y: 0 };
	private connecting = false;
	private connectFrom: string | null = null;
	private ghost: SVGPathElement | null = null;
	private dropTarget: string | null = null;
	private tapConnectFrom: string | null = null;

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
			nodeAt: (point) =>
				this.mode === "force" || this.connecting ? this.hitTest(point) : null,
			onNodeDrag: (path, point, phase) => this.onNodeDrag(path, point, phase),
			onContextMenu: (point, client) => this.onContextMenu(point, client),
		});

		this.observer = new ResizeObserver(() => {
			this.gestures.invalidateBounds();
			if (this.pendingFit) this.fit(false);
		});
		this.observer.observe(this.container);
		document.addEventListener("keydown", this.onKeyDown);
	}

	destroy(): void {
		this.stopSimulation();
		this.observer.disconnect();
		this.gestures.destroy();
		document.removeEventListener("keydown", this.onKeyDown);
		this.svg.remove();
	}

	render(
		layout: GraphLayout,
		options: { fit: boolean; mode: CanvasMode; relations: NoteRelation[]; force?: ForceOptions }
	): void {
		this.layout = layout;
		this.mode = options.mode;
		this.forceOptions = options.force ?? DEFAULT_FORCE_OPTIONS;
		this.edgeLayer.empty();
		this.edgeElements = [];
		this.neighbours.clear();
		this.hitAreas = [];
		this.hovered = null;
		this.tapConnectFrom = null;
		this.svg.toggleClass("is-connecting", this.connecting);

		if (this.mode === "flow") {
			if (layout.unlinkedTop !== null) {
				this.edgeLayer.appendChild(this.buildUnlinkedDivider(layout));
			}
			for (const group of layout.groups) {
				this.edgeLayer.appendChild(this.buildGroupHeader(group));
			}
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

		this.setupSimulation(layout, options.relations);
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
		const area =
			this.simulation && this.mode === "force"
				? this.simulation.bounds()
				: { x: 0, y: 0, width: layout.width, height: layout.height };
		this.gestures.fit(area, FIT_PADDING, animate);
	}

	unpinAll(): void {
		if (!this.simulation) return;
		this.simulation.unpinAll();
		this.startSimulation();
	}

	get pinnedCount(): number {
		return this.simulation?.pinnedCount ?? 0;
	}

	private setupSimulation(layout: GraphLayout, relations: NoteRelation[]): void {
		this.stopSimulation();

		if (this.mode !== "force") {
			this.simulation = null;
			this.nodeLayer.removeClass("is-simulating");
			return;
		}

		const previous = this.simulation;
		const simulation = new ForceSimulation(layout, relations, this.forceOptions);
		let carriedNodes = 0;
		for (const node of simulation.nodes) {
			const carried = previous?.get(node.path);
			if (!carried) continue;
			node.x = carried.x;
			node.y = carried.y;
			node.fixed = carried.fixed;
			carriedNodes++;
		}
		if (carriedNodes > 0) simulation.setAlpha(0.35);

		this.simulation = simulation;
		this.nodeLayer.addClass("is-simulating");
		this.startSimulation();
	}

	private startSimulation(): void {
		if (!this.simulation || this.simulationFrame) return;
		const step = () => {
			const simulation = this.simulation;
			if (!simulation) {
				this.simulationFrame = 0;
				return;
			}
			simulation.tick();
			this.updateSimulatedPositions();
			this.simulationFrame = simulation.running ? requestAnimationFrame(step) : 0;
		};
		this.simulationFrame = requestAnimationFrame(step);
	}

	private stopSimulation(): void {
		if (this.simulationFrame) cancelAnimationFrame(this.simulationFrame);
		this.simulationFrame = 0;
	}

	private updateSimulatedPositions(): void {
		const simulation = this.simulation;
		if (!simulation) return;

		this.hitAreas = [];
		for (const node of simulation.nodes) {
			const element = this.nodeElements.get(node.path);
			const x = node.x - node.width / 2;
			const y = node.y - node.height / 2;
			element?.setAttribute("transform", `translate(${x} ${y})`);
			this.hitAreas.push({ path: node.path, x, y, width: node.width, height: node.height });
		}

		for (const edge of this.edgeElements) {
			const from = simulation.get(edge.relation.from);
			const to = simulation.get(edge.relation.to);
			if (!from || !to) continue;
			edge.element.setAttribute(
				"d",
				curveBetween(borderPoint(from, to), borderPoint(to, from))
			);
		}
	}

	setConnecting(connecting: boolean): void {
		this.connecting = connecting;
		this.svg.toggleClass("is-connecting", connecting);
	}

	/** Tap-to-connect entry point for touch: highlights the source, then the next tap picks the target. */
	beginConnectFrom(path: string): void {
		this.cancelTapConnect();
		this.tapConnectFrom = path;
		this.nodeElements.get(path)?.addClass("is-connect-source");
		this.svg.addClass("is-connecting");
	}

	cancelTapConnect(): void {
		if (!this.tapConnectFrom) return;
		this.nodeElements.get(this.tapConnectFrom)?.removeClass("is-connect-source");
		this.tapConnectFrom = null;
		this.svg.toggleClass("is-connecting", this.connecting);
	}

	private onKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape" && this.tapConnectFrom) {
			event.preventDefault();
			this.cancelTapConnect();
		}
	};

	private nodeCentre(path: string): Point | null {
		const area = this.hitAreas.find((entry) => entry.path === path);
		return area ? { x: area.x + area.width / 2, y: area.y + area.height / 2 } : null;
	}

	private markDropTarget(path: string | null): void {
		if (path === this.dropTarget) return;
		if (this.dropTarget) this.nodeElements.get(this.dropTarget)?.removeClass("is-drop-target");
		if (path) this.nodeElements.get(path)?.addClass("is-drop-target");
		this.dropTarget = path;
	}

	private onConnectDrag(path: string, point: Point, phase: DragPhase): void {
		if (phase === "start") {
			this.connectFrom = path;
			this.ghost = svgEl("path", { class: "spm-flow-edge is-ghost" });
			this.edgeLayer.appendChild(this.ghost);
			return;
		}

		const from = this.connectFrom ? this.nodeCentre(this.connectFrom) : null;
		if (!from || !this.connectFrom) return;

		if (phase === "move") {
			const target = this.hitTest(point);
			this.markDropTarget(target === this.connectFrom ? null : target);
			this.ghost?.setAttribute("d", curveBetween(from, point));
			return;
		}

		const target = this.hitTest(point);
		const source = this.connectFrom;
		this.ghost?.remove();
		this.ghost = null;
		this.connectFrom = null;
		this.markDropTarget(null);

		if (target && target !== source) {
			this.handlers.onConnect(source, target, this.gestures.toClient(point));
		}
	}

	private onNodeDrag(path: string, point: Point, phase: DragPhase): void {
		if (this.connecting) {
			this.onConnectDrag(path, point, phase);
			return;
		}

		const simulation = this.simulation;
		const node = simulation?.get(path);
		if (!simulation || !node) return;

		if (phase === "start") {
			this.grabOffset = { x: node.x - point.x, y: node.y - point.y };
			simulation.pin(path, node.x, node.y);
			simulation.reheat(0.3);
			this.startSimulation();
			return;
		}

		if (phase === "move") {
			simulation.pin(path, point.x + this.grabOffset.x, point.y + this.grabOffset.y);
			simulation.reheat(0.3);
			this.startSimulation();
		}
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

	private distanceToPath(path: SVGPathElement, point: Point): number {
		const length = path.getTotalLength();
		if (length === 0) return Infinity;
		const samples = Math.min(40, Math.max(8, Math.round(length / 12)));
		let minDistance = Infinity;
		for (let index = 0; index <= samples; index++) {
			const sample = path.getPointAtLength((length * index) / samples);
			minDistance = Math.min(minDistance, Math.hypot(sample.x - point.x, sample.y - point.y));
		}
		return minDistance;
	}

	private hitTestEdge(point: Point): NoteRelation | null {
		const tolerance = EDGE_HIT_TOLERANCE / this.gestures.transform.k;
		let closest: { relation: NoteRelation; distance: number } | null = null;
		for (const edge of this.edgeElements) {
			const distance = this.distanceToPath(edge.element, point);
			if (distance <= tolerance && (!closest || distance < closest.distance)) {
				closest = { relation: edge.relation, distance };
			}
		}
		return closest?.relation ?? null;
	}

	private onContextMenu(point: Point, client: Point): void {
		const nodePath = this.hitTest(point);
		if (nodePath) {
			this.handlers.onMenu(nodePath, client);
			return;
		}
		const edge = this.hitTestEdge(point);
		if (edge) {
			this.handlers.onEdgeMenu(edge, client);
			return;
		}
		this.handlers.onMenu(null, client);
	}

	private onTap(point: Point, event: PointerEvent): void {
		const path = this.hitTest(point);

		if (this.tapConnectFrom) {
			const source = this.tapConnectFrom;
			this.cancelTapConnect();
			if (path && path !== source) {
				this.handlers.onConnect(source, path, this.gestures.toClient(point));
			}
			return;
		}

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
		this.edgeElements.push({ element: path, relation: edge.relation });
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
		if (record.hiddenMentions) {
			meta.createSpan({
				cls: "spm-flow-chip is-collapsed",
				text: `+${record.hiddenMentions} mentions`,
			});
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
			const active = edge.relation.from === path || edge.relation.to === path;
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
