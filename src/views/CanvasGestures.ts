export interface Point {
	x: number;
	y: number;
}

export interface Transform {
	x: number;
	y: number;
	k: number;
}

export type DragPhase = "start" | "move" | "end";

export interface GestureHandlers {
	onTransform(transform: Transform): void;
	onTap(point: Point, event: PointerEvent): void;
	onHover(point: Point | null): void;
	onGesture(active: boolean): void;
	onDoubleClick(point: Point): void;
	nodeAt(point: Point): string | null;
	onNodeDrag(path: string, point: Point, phase: DragPhase): void;
	onContextMenu(point: Point, client: Point): void;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 3;
const TAP_MOVEMENT = 10;
const TAP_DURATION = 600;
const FRICTION = 0.93;
const MIN_VELOCITY = 0.03;
const RECT_TTL = 250;
const ANIMATION_MS = 260;
const LONG_PRESS_MS = 550;

function distance(a: Point, b: Point): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a: Point, b: Point): Point {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export class CanvasGestures {
	transform: Transform = { x: 0, y: 0, k: 1 };

	private pointers = new Map<number, Point>();
	private mode: "none" | "pan" | "pinch" | "node" = "none";
	private draggedNode: string | null = null;
	private lastDragPoint: Point | null = null;
	private pinchDistance = 0;
	private pinchCentre: Point = { x: 0, y: 0 };
	private velocity: Point = { x: 0, y: 0 };
	private lastMove = 0;
	private moved = 0;
	private tapStart = 0;
	private inertiaFrame = 0;
	private animationFrame = 0;
	private renderFrame = 0;
	private rect: DOMRect | null = null;
	private rectTime = 0;
	private longPress: ReturnType<typeof setTimeout> | null = null;

	constructor(private element: SVGSVGElement, private handlers: GestureHandlers) {
		element.addEventListener("wheel", this.onWheel, { passive: false });
		element.addEventListener("pointerdown", this.onPointerDown);
		element.addEventListener("pointermove", this.onPointerMove);
		element.addEventListener("pointerup", this.onPointerUp);
		element.addEventListener("pointercancel", this.onPointerUp);
		element.addEventListener("pointerleave", this.onPointerLeave);
		element.addEventListener("dblclick", this.onDoubleClick);
		element.addEventListener("contextmenu", this.onContextMenu);
		element.addEventListener("touchstart", this.onTouchStart, { passive: false });
		element.addEventListener("touchmove", this.onTouchMove, { passive: false });
	}

	destroy(): void {
		this.stopMotion();
		if (this.renderFrame) cancelAnimationFrame(this.renderFrame);
		this.element.removeEventListener("wheel", this.onWheel);
		this.element.removeEventListener("pointerdown", this.onPointerDown);
		this.element.removeEventListener("pointermove", this.onPointerMove);
		this.element.removeEventListener("pointerup", this.onPointerUp);
		this.element.removeEventListener("pointercancel", this.onPointerUp);
		this.element.removeEventListener("pointerleave", this.onPointerLeave);
		this.element.removeEventListener("dblclick", this.onDoubleClick);
		this.element.removeEventListener("contextmenu", this.onContextMenu);
		this.cancelLongPress();
		this.element.removeEventListener("touchstart", this.onTouchStart);
		this.element.removeEventListener("touchmove", this.onTouchMove);
	}

	invalidateBounds(): void {
		this.rect = null;
	}

	get bounds(): DOMRect {
		const now = performance.now();
		if (!this.rect || now - this.rectTime > RECT_TTL) {
			this.rect = this.element.getBoundingClientRect();
			this.rectTime = now;
		}
		return this.rect;
	}

	toGraph(point: Point): Point {
		return {
			x: (point.x - this.transform.x) / this.transform.k,
			y: (point.y - this.transform.y) / this.transform.k,
		};
	}

	toClient(point: Point): Point {
		const bounds = this.bounds;
		return {
			x: point.x * this.transform.k + this.transform.x + bounds.left,
			y: point.y * this.transform.k + this.transform.y + bounds.top,
		};
	}

	moveTo(target: Transform, animate: boolean): void {
		this.stopMotion();
		if (!animate) {
			this.transform = { ...target };
			this.schedule();
			return;
		}

		const from = { ...this.transform };
		const start = performance.now();
		const step = () => {
			const progress = Math.min(1, (performance.now() - start) / ANIMATION_MS);
			const eased = 1 - Math.pow(1 - progress, 3);
			this.transform = {
				x: from.x + (target.x - from.x) * eased,
				y: from.y + (target.y - from.y) * eased,
				k: from.k + (target.k - from.k) * eased,
			};
			this.apply();
			this.animationFrame = progress < 1 ? requestAnimationFrame(step) : 0;
		};
		this.animationFrame = requestAnimationFrame(step);
	}

	zoomBy(factor: number, animate = true): void {
		const bounds = this.bounds;
		const anchor = { x: bounds.width / 2, y: bounds.height / 2 };
		this.moveTo(this.scaled(factor, anchor), animate);
	}

	fit(area: { x: number; y: number; width: number; height: number }, padding: number, animate: boolean): void {
		const bounds = this.bounds;
		const scale = Math.min(
			(bounds.width - padding * 2) / Math.max(area.width, 1),
			(bounds.height - padding * 2) / Math.max(area.height, 1),
			1
		);
		const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
		this.moveTo(
			{
				k,
				x: (bounds.width - area.width * k) / 2 - area.x * k,
				y: (bounds.height - area.height * k) / 2 - area.y * k,
			},
			animate
		);
	}

	private scaled(factor: number, anchor: Point): Transform {
		const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.transform.k * factor));
		const ratio = k / this.transform.k;
		return {
			k,
			x: anchor.x - (anchor.x - this.transform.x) * ratio,
			y: anchor.y - (anchor.y - this.transform.y) * ratio,
		};
	}

	private local(event: { clientX: number; clientY: number }): Point {
		const bounds = this.bounds;
		return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
	}

	private apply(): void {
		this.handlers.onTransform(this.transform);
	}

	private schedule(): void {
		if (this.renderFrame) return;
		this.renderFrame = requestAnimationFrame(() => {
			this.renderFrame = 0;
			this.apply();
		});
	}

	private stopMotion(): void {
		if (this.inertiaFrame) cancelAnimationFrame(this.inertiaFrame);
		if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
		this.inertiaFrame = 0;
		this.animationFrame = 0;
	}

	private startInertia(): void {
		if (Math.hypot(this.velocity.x, this.velocity.y) < MIN_VELOCITY) return;

		let previous = performance.now();
		const step = () => {
			const now = performance.now();
			const elapsed = Math.min(32, now - previous);
			previous = now;

			this.transform.x += this.velocity.x * elapsed;
			this.transform.y += this.velocity.y * elapsed;
			this.velocity.x *= Math.pow(FRICTION, elapsed / 16);
			this.velocity.y *= Math.pow(FRICTION, elapsed / 16);
			this.apply();

			this.inertiaFrame =
				Math.hypot(this.velocity.x, this.velocity.y) > MIN_VELOCITY
					? requestAnimationFrame(step)
					: 0;
		};
		this.inertiaFrame = requestAnimationFrame(step);
	}

	private onPointerDown = (event: PointerEvent): void => {
		if (event.button !== 0 && event.button !== 1) return;
		this.stopMotion();
		this.element.setPointerCapture(event.pointerId);
		this.pointers.set(event.pointerId, this.local(event));

		if (this.pointers.size === 1) {
			const graphPoint = this.toGraph(this.local(event));
			this.draggedNode = this.handlers.nodeAt(graphPoint);
			this.mode = this.draggedNode ? "node" : "pan";
			this.moved = 0;
			this.tapStart = performance.now();
			this.lastMove = this.tapStart;
			this.velocity = { x: 0, y: 0 };
			if (this.draggedNode) {
				this.lastDragPoint = graphPoint;
				this.handlers.onNodeDrag(this.draggedNode, graphPoint, "start");
			} else {
				this.handlers.onGesture(true);
			}
			if (event.pointerType !== "mouse") this.armLongPress(this.local(event));
		} else if (this.pointers.size === 2) {
			this.cancelLongPress();
			this.endNodeDrag(this.lastDragPoint ?? undefined);
			const [a, b] = [...this.pointers.values()];
			this.mode = "pinch";
			this.pinchDistance = distance(a, b);
			this.pinchCentre = midpoint(a, b);
			this.velocity = { x: 0, y: 0 };
		}
	};

	private endNodeDrag(point?: Point): void {
		if (!this.draggedNode) return;
		this.handlers.onNodeDrag(this.draggedNode, point ?? this.lastDragPoint ?? { x: 0, y: 0 }, "end");
		this.draggedNode = null;
		this.lastDragPoint = null;
	}

	private onPointerMove = (event: PointerEvent): void => {
		const previous = this.pointers.get(event.pointerId);
		const point = this.local(event);

		if (!previous) {
			if (this.mode === "none" && event.pointerType === "mouse") {
				this.handlers.onHover(this.toGraph(point));
			}
			return;
		}

		this.pointers.set(event.pointerId, point);

		if (this.mode === "node" && this.draggedNode) {
			this.moved += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
			if (this.moved > TAP_MOVEMENT) this.cancelLongPress();
			this.lastDragPoint = this.toGraph(point);
			this.handlers.onNodeDrag(this.draggedNode, this.lastDragPoint, "move");
			return;
		}

		if (this.mode === "pan") {
			const dx = point.x - previous.x;
			const dy = point.y - previous.y;
			const now = performance.now();
			const elapsed = Math.max(1, now - this.lastMove);
			this.lastMove = now;
			this.moved += Math.abs(dx) + Math.abs(dy);
			if (this.moved > TAP_MOVEMENT) this.cancelLongPress();
			this.velocity = {
				x: this.velocity.x * 0.3 + (dx / elapsed) * 0.7,
				y: this.velocity.y * 0.3 + (dy / elapsed) * 0.7,
			};
			this.transform.x += dx;
			this.transform.y += dy;
			this.schedule();
			return;
		}

		if (this.mode === "pinch" && this.pointers.size >= 2) {
			const [a, b] = [...this.pointers.values()];
			const spread = distance(a, b);
			const centre = midpoint(a, b);
			if (this.pinchDistance > 0) {
				this.transform = this.scaled(spread / this.pinchDistance, this.pinchCentre);
			}
			this.transform.x += centre.x - this.pinchCentre.x;
			this.transform.y += centre.y - this.pinchCentre.y;
			this.pinchDistance = spread;
			this.pinchCentre = centre;
			this.schedule();
		}
	};

	private onPointerUp = (event: PointerEvent): void => {
		this.cancelLongPress();
		if (!this.pointers.has(event.pointerId)) return;
		const point = this.local(event);
		this.pointers.delete(event.pointerId);
		if (this.element.hasPointerCapture(event.pointerId)) {
			this.element.releasePointerCapture(event.pointerId);
		}

		if (this.pointers.size === 1) {
			const remaining = [...this.pointers.values()][0];
			this.mode = "pan";
			this.moved = TAP_MOVEMENT + 1;
			this.lastMove = performance.now();
			this.velocity = { x: 0, y: 0 };
			this.pinchCentre = remaining;
			return;
		}

		if (this.pointers.size > 0) return;

		const wasTap =
			this.mode !== "pinch" &&
			this.moved <= TAP_MOVEMENT &&
			performance.now() - this.tapStart <= TAP_DURATION;
		const wasNodeDrag = this.mode === "node";

		this.endNodeDrag(this.toGraph(point));
		this.mode = "none";
		this.handlers.onGesture(false);

		if (wasTap) this.handlers.onTap(this.toGraph(point), event);
		else if (!wasNodeDrag) this.startInertia();
	};

	private onPointerLeave = (event: PointerEvent): void => {
		if (this.pointers.size === 0 && event.pointerType === "mouse") {
			this.handlers.onHover(null);
		}
	};

	private onWheel = (event: WheelEvent): void => {
		event.preventDefault();
		this.stopMotion();
		this.transform = this.scaled(Math.pow(0.999, event.deltaY), this.local(event));
		this.schedule();
	};

	private cancelLongPress(): void {
		if (this.longPress !== null) clearTimeout(this.longPress);
		this.longPress = null;
	}

	private armLongPress(point: Point): void {
		this.cancelLongPress();
		this.longPress = setTimeout(() => {
			this.longPress = null;
			this.endNodeDrag(this.toGraph(point));
			this.mode = "none";
			this.pointers.clear();
			this.handlers.onGesture(false);
			this.handlers.onContextMenu(this.toGraph(point), this.toClient(this.toGraph(point)));
		}, LONG_PRESS_MS);
	}

	private onContextMenu = (event: MouseEvent): void => {
		event.preventDefault();
		this.cancelLongPress();
		const point = this.local(event);
		this.handlers.onContextMenu(this.toGraph(point), { x: event.clientX, y: event.clientY });
	};

	private onDoubleClick = (event: MouseEvent): void => {
		event.preventDefault();
		this.handlers.onDoubleClick(this.toGraph(this.local(event)));
	};

	private onTouchStart = (event: TouchEvent): void => {
		event.stopPropagation();
	};

	private onTouchMove = (event: TouchEvent): void => {
		event.preventDefault();
		event.stopPropagation();
	};
}
