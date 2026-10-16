import type { OutlineMethod } from '@/types.js';
import { easings } from '@/math/easings.js';
import { getStyleProperty } from '@/platform/dom.js';
import { createCanvas, get2dContext, roundRect } from '@/render/canvas.js';
import type { CanvasImage } from '@/render/canvas.js';
import type { ITagCanvas } from '@/core/tagcanvas-type.js';

/**
 * The subset of a `Tag` that {@link Outline} reads and mutates. `Tag`
 * satisfies this structurally; keeping it a local interface breaks the
 * `outline` -> `tag` runtime import edge.
 *
 * Field/method names use the project's American spelling and lowerCamelCase
 * (`color`, `draw`, `drawImage`), matching how `Tag` exposes them.
 */
export interface TagLike {
	/** The tag's anchor element; its computed CSS color resolves `'tag'`/`'tagbg'` outline colors. */
	readonly a: HTMLElement;
	/** The tag's source bitmap (a loaded image), or `null` when the tag is text-only. */
	image: CanvasImage | null;
	/** The composited foreground bitmap drawn each frame, or `null` for live text drawing. */
	fimage: CanvasImage | null;
	/** The pre-rendered highlight bitmap used by the `'color'`/`'size'` methods, or `null`. */
	oimage: CanvasImage | null;
	/** The alternate image drawn over the active tag when `altImage` is enabled, or `null`. */
	alt: CanvasImage | null;
	/** Ratio of the `'size'`-method outline bitmap's size to the base bitmap's size. */
	oscale: number;
	/** Current draw opacity (0..1); mutated by the outline while compositing. */
	alpha: number;
	/** The tag's text color; temporarily swapped for the highlight color by `'color'` text outlines. */
	color: string;
	/** Tag width; temporarily scaled by the `'size'` method, then restored. */
	w: number;
	/** Tag height; temporarily scaled by the `'size'` method, then restored. */
	h: number;
	/** Draws the tag (text or image) at a canvas offset, optionally overriding its bitmap. */
	draw(c: CanvasRenderingContext2D, xoff: number, yoff: number, im?: CanvasImage | null): void;
	/** Draws a specific image for the tag at a canvas offset. */
	drawImage(c: CanvasRenderingContext2D, xoff: number, yoff: number, im?: CanvasImage | null): void;
}

/**
 * Signature shared by the interchangeable draw-phase slots
 * (`preDraw`/`postDraw`/`lastDraw`/`draw`). Every parameter after `c` is
 * optional because the same functions are called both with a full argument
 * list (as `preDraw`) and with just the context (as `postDraw`/`lastDraw`).
 * The boolean result is only consulted for `preDraw` (truthy means "the active
 * tag was already drawn, skip the normal draw").
 */
type DrawSlot = (
	c: CanvasRenderingContext2D,
	tag?: TagLike,
	x1?: number,
	y1?: number,
	ga?: number,
	useGa?: boolean,
) => boolean;

/**
 * Signature of the geometry-drawing strategy selected by
 * {@link Outline.setMethod} and invoked by {@link Outline}'s draw slot.
 */
type DrawFunc = (
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
	tag?: TagLike,
	x1?: number,
	y1?: number,
) => boolean;

/**
 * Shared offscreen scratch canvas used only by {@link Outline.drawColourImage}
 * (module-private, lazily created, reused across all outlines). Ported from the
 * module-scope `ocanvas`. It is written and read within a single synchronous
 * call, so sharing one instance has no lifecycle hazard.
 */
let ocanvas: HTMLCanvasElement | null = null;

/** Draws the highlight behind/around the active tag for a single {@link TagLike}. */
export class Outline {
	/** Left edge of the outline box (canvas pixels), set by {@link Outline.update}. */
	x = 1;
	/** Top edge of the outline box (canvas pixels), set by {@link Outline.update}. */
	y = 1;
	/** Outline box width (canvas pixels), set by {@link Outline.update}. */
	w = 1;
	/** Outline box height (canvas pixels), set by {@link Outline.update}. */
	h = 1;
	/** Projected scale of the tag; read by the cloud to find the frontmost active tag. */
	sc = 1;
	/** Projected depth of the tag; read by the cloud (front-select uses `z <= 0`). */
	z = 0;
	/** Resolved outline color (with `'tag'`/`'tagbg'` expanded); also updated by weighting. */
	color: string;
	/** The tag this outline belongs to. Reassigned by the cloud's draw loop. */
	tag: TagLike;

	/** Draw slot invoked before the tag is drawn (`block`/`color`/`size` methods). */
	preDraw: DrawSlot = () => false;
	/** Draw slot invoked after the tag is drawn (`outline` method). */
	postDraw: DrawSlot = () => false;
	/** Draw slot invoked once, after every tag is drawn (`classic`/`none` methods). */
	lastDraw: DrawSlot = () => false;

	private readonly ctx: ITagCanvas;
	/** Whether this outline pulsates (`pulsateTo < 1`). */
	private readonly pulsate: boolean;
	/** Marching-ants dash length (`~~outlineDash`). */
	private readonly adash: number;
	/** Marching-ants gap length (`~~outlineDashSpace || adash`). */
	private readonly agap: number;
	/** Marching-ants animation speed (`outlineDashSpeed`). */
	private readonly aspeed: number;
	/** Outline corner radius (`outlineRadius | 0`). */
	private readonly radius: number;
	/** Timestamp (ms) the tag became active, or `null` when inactive; drives pulse/ants timing. */
	private ts: number | null = null;
	/** Current pulse factor (0..1); `1` when not mid-pulse. */
	private pulse = 1;
	/** The active draw function (`drawSimple` or `drawPulsate`), copied into a slot by `setMethod`. */
	private draw: DrawSlot = () => false;
	/** The pre-`alt` `preDraw`, preserved when `altImage` wraps `preDraw` with `drawAlt`. */
	private realPreDraw: DrawSlot = () => false;
	/** The geometry strategy selected by `setMethod`. */
	private drawFunc: DrawFunc = () => false;

	constructor(ctx: ITagCanvas, tag: TagLike) {
		const opts = ctx.opts;
		this.ctx = ctx;
		this.tag = tag;
		this.pulsate = opts.pulsateTo < 1;
		let color = opts.outlineColor;
		if (color === 'tag') {
			color = getStyleProperty(tag.a, 'color');
		} else if (color === 'tagbg') {
			color = getStyleProperty(tag.a, 'background-color');
		}
		this.color = color;
		this.adash = Math.trunc(opts.outlineDash);
		this.agap = Math.trunc(opts.outlineDashSpace) || this.adash;
		this.aspeed = opts.outlineDashSpeed;
		this.radius = opts.outlineRadius | 0;
		this.draw = this.pulsate ? this.drawPulsate.bind(this) : this.drawSimple.bind(this);
		this.setMethod(opts.outlineMethod, opts.altImage);
	}

	/**
   * Selects the draw strategy for `outlineMethod`, wiring `drawFunc` and the
   * active draw slot. When `alt` is set, `preDraw` is wrapped so the tag's
   * alternate image is drawn on top. Ported from `SetMethod`; the `'colour'`
   * key is renamed `'color'`.
   */
	setMethod(om: OutlineMethod, alt: boolean): void {
		switch (om) {
			case 'block':
				this.drawFunc = this.drawBlock.bind(this);
				this.preDraw = this.draw;
				break;
			case 'color':
				this.drawFunc = this.drawColour.bind(this);
				this.preDraw = this.draw;
				break;
			case 'classic':
				this.drawFunc = this.drawOutline.bind(this);
				this.lastDraw = this.draw;
				break;
			case 'size':
				this.drawFunc = this.drawSize.bind(this);
				this.preDraw = this.draw;
				break;
			case 'none':
				this.draw = () => true;
				this.lastDraw = this.draw;
				break;
			case 'outline':
			default:
				this.drawFunc = this.drawOutline.bind(this);
				this.postDraw = this.draw;
				break;
		}
		if (alt) {
			this.realPreDraw = this.preDraw;
			this.preDraw = this.drawAlt.bind(this);
		}
	}

	/** Recomputes the outline box from the tag's projected geometry. Ported from `Update`. */
	update(x: number, y: number, w: number, h: number, sc: number, z: number, xo: number, yo: number): void {
		const o = this.ctx.opts.outlineOffset;
		const o2 = 2 * o;
		this.x = sc * x + xo - o;
		this.y = sc * y + yo - o;
		this.w = sc * w + o2;
		this.h = sc * h + o2;
		this.sc = sc; // used to determine frontmost
		this.z = z;
	}

	/**
   * Tests whether `(x, y)` is inside the outline box, latching the activation
   * timestamp on entry and clearing it on exit. Ported from `Active`; the
   * unused context argument the original accepted is dropped.
   */
	active(x: number, y: number): boolean {
		const a = x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h;
		if (a) {
			this.ts = this.ts ?? performance.now();
		} else {
			this.ts = null;
		}
		return a;
	}

	/** Applies the marching-ants dash pattern to `c`. Ported from `Ants`. */
	private ants(c: CanvasRenderingContext2D): void {
		if (!this.adash) {
			return;
		}
		const l = this.adash;
		const g = this.agap;
		const length = l + g;
		let s = this.aspeed;
		let l1 = 0;
		let l2 = l;
		let g1 = g;
		let g2 = 0;
		if (s) {
			const diff = this.ts === null ? 0 : performance.now() - this.ts;
			let seq = Math.abs(s) * diff / 50;
			if (s < 0) {
				seq = 8.64e6 - seq;
			}
			s = Math.trunc(seq) % length;
		}
		let ants: number[];
		if (s) {
			if (l >= s) {
				l1 = l - s;
				l2 = s;
			} else {
				g1 = length - s;
				g2 = g - g1;
			}
			ants = [l1, g1, l2, g2];
		} else {
			ants = [l, g];
		}
		c.setLineDash(ants);
	}

	/** Strokes the rounded outline box with marching ants. Ported from `DrawOutline`. */
	private drawOutline(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): boolean {
		const r = Math.min(this.radius, h / 2, w / 2);
		c.strokeStyle = color;
		this.ants(c);
		roundRect(c, x, y, w, h, r, true);
		return false;
	}

	/** Fills the rounded outline box behind the tag. Ported from `DrawBlock`. */
	private drawBlock(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): boolean {
		const r = Math.min(this.radius, h / 2, w / 2);
		c.fillStyle = color;
		roundRect(c, x, y, w, h, r);
		return false;
	}

	/** Draws the tag scaled up as the `'size'` highlight. Ported from `DrawSize`. */
	private drawSize(
		c: CanvasRenderingContext2D, _x: number, _y: number, _w: number, _h: number, _color: string,
		tag?: TagLike, x1?: number, y1?: number,
	): boolean {
		if (!tag || x1 === undefined || y1 === undefined) {
			return true;
		}
		const tw = tag.w;
		const th = tag.h;
		let i: CanvasImage | null;
		if (this.pulsate) {
			let sc: number;
			if (tag.image) {
				sc = (tag.image.height + this.ctx.opts.outlineIncrease) / tag.image.height;
			} else {
				sc = tag.oscale;
			}
			i = tag.fimage ?? tag.image;
			const m = 1 + ((sc - 1) * (1 - this.pulse));
			tag.h *= m;
			tag.w *= m;
		} else {
			i = tag.oimage;
		}
		tag.alpha = 1;
		tag.draw(c, x1, y1, i);
		tag.h = th;
		tag.w = tw;
		return true;
	}

	/** Draws the tag in the highlight color. Ported from `DrawColour`. */
	private drawColour(
		c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string,
		tag?: TagLike, x1?: number, y1?: number,
	): boolean {
		if (!tag || x1 === undefined || y1 === undefined) {
			return true;
		}
		if (tag.oimage) {
			if (this.pulse < 1) {
				tag.alpha = 1 - this.pulse ** 2;
				tag.draw(c, x1, y1, tag.fimage);
				tag.alpha = this.pulse;
			} else {
				tag.alpha = 1;
			}
			tag.draw(c, x1, y1, tag.oimage);
			return true;
		}
		return tag.image
			? this.drawColourImage(c, x, y, w, h, color, tag, x1, y1)
			: this.drawColourText(c, x, y, w, h, color, tag, x1, y1);
	}

	/** Redraws a text tag using the highlight color. Ported from `DrawColourText`. */
	private drawColourText(
		c: CanvasRenderingContext2D, _x: number, _y: number, _w: number, _h: number, color: string,
		tag?: TagLike, x1?: number, y1?: number,
	): boolean {
		if (!tag || x1 === undefined || y1 === undefined) {
			return true;
		}
		const normal = tag.color;
		tag.color = color;
		tag.alpha = 1;
		tag.draw(c, x1, y1);
		tag.color = normal;
		return true;
	}

	/**
   * Recolors an image tag by compositing it through the highlight color via the
   * shared scratch canvas. Ported from `DrawColourImage`; the IE give-up
   * branch is removed since {@link createCanvas} never fails.
   */
	private drawColourImage(
		c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string,
		tag?: TagLike, x1?: number, y1?: number,
	): boolean {
		if (!tag || x1 === undefined || y1 === undefined) {
			return true;
		}
		const ccanvas = c.canvas;
		const fx = Math.trunc(Math.max(x, 0));
		const fy = Math.trunc(Math.max(y, 0));
		const fw = (Math.min(ccanvas.width - fx, w) + 0.5) | 0;
		const fh = (Math.min(ccanvas.height - fy, h) + 0.5) | 0;
		let oc = ocanvas;
		if (oc) {
			oc.width = fw;
			oc.height = fh;
		} else {
			oc = createCanvas(fw, fh);
			ocanvas = oc;
		}
		const cc = get2dContext(oc);

		cc.drawImage(ccanvas, fx, fy, fw, fh, 0, 0, fw, fh);
		c.clearRect(fx, fy, fw, fh);
		if (this.pulsate) {
			tag.alpha = 1 - this.pulse ** 2;
		} else {
			tag.alpha = 1;
		}
		tag.draw(c, x1, y1);
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.save();
		c.beginPath();
		c.rect(fx, fy, fw, fh);
		c.clip();
		c.globalCompositeOperation = 'source-in';
		c.fillStyle = color;
		c.fillRect(fx, fy, fw, fh);
		c.restore();
		c.globalAlpha = 1;
		c.globalCompositeOperation = 'destination-over';
		c.drawImage(oc, 0, 0, fw, fh, fx, fy, fw, fh);
		c.globalCompositeOperation = 'source-over';
		return true;
	}

	/** Runs the wrapped `preDraw`, then overlays the tag's alt image. Ported from `DrawAlt`. */
	private drawAlt(
		c: CanvasRenderingContext2D, tag?: TagLike, x1?: number, y1?: number, ga?: number, useGa?: boolean,
	): boolean {
		let r = this.realPreDraw(c, tag, x1, y1, ga, useGa);
		if (tag && tag.alt && x1 !== undefined && y1 !== undefined) {
			tag.drawImage(c, x1, y1, tag.alt);
			r = true;
		}
		return r;
	}

	/**
   * Sets up context state, then invokes the selected geometry strategy. Ported
   * from `DrawSimple`.
   */
	private drawSimple(
		c: CanvasRenderingContext2D, tag?: TagLike, x1?: number, y1?: number, ga?: number, useGa?: boolean,
	): boolean {
		const opts = this.ctx.opts;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.strokeStyle = this.color;
		c.lineWidth = opts.outlineThickness;
		c.shadowBlur = c.shadowOffsetX = c.shadowOffsetY = 0;
		c.globalAlpha = useGa ? (ga ?? 1) : 1;
		return this.drawFunc(c, this.x, this.y, this.w, this.h, this.color, tag, x1, y1);
	}

	/**
   * Computes the current pulse alpha and defers to {@link Outline.drawSimple}.
   * Ported from `DrawPulsate`; `TagCanvas.Smooth(1, ga)` is `easings.smooth(ga)`.
   */
	private drawPulsate(c: CanvasRenderingContext2D, tag?: TagLike, x1?: number, y1?: number): boolean {
		const opts = this.ctx.opts;
		const diff = this.ts === null ? 0 : performance.now() - this.ts;
		let ga = opts.pulsateTo + ((1 - opts.pulsateTo) *
      (0.5 + (Math.cos(2 * Math.PI * diff / (1000 * opts.pulsateTime)) / 2)));
		ga = easings.smooth(ga);
		this.pulse = ga;
		return this.drawSimple(c, tag, x1, y1, ga, true);
	}
}
