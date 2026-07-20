import type { Offset2D, WeightMode } from '@/types.js';
import type { Matrix } from '@/math/matrix.js';
import { clamp, project } from '@/math/utils.js';
import { Vector } from '@/math/vector.js';
import { getStyleProperty, isImageBroken, resolveImageSize } from '@/platform/dom.js';
import { createTrack, getAudioContext } from '@/platform/audio.js';
import type { AudioTrack } from '@/platform/audio.js';
import type { CanvasImage } from '@/render/canvas.js';
import {
  addBackgroundToImage,
  addShadowToImage,
  expandImage,
  findTextBoundingBox,
  roundImage,
  scaleImage,
} from '@/render/image.js';
import { TextCanvas } from '@/render/text-canvas.js';
import type { CloudContext } from '@/core/cloud-context.js';
import { Outline } from '@/core/outline.js';
import type { TagLike } from '@/core/outline.js';

/**
 * The data a {@link Tag} needs at construction time. Produced by the cloud's
 * tag factory (`CreateTag`/`GetTags`), it flattens the original `Tag`
 * constructor's positional argument list into a single object.
 *
 * Falsy color/font fields fall back to the cloud's options exactly as the
 * original constructor's `col || tc.textColour`-style defaults did.
 */
export interface TagInit {
  /**
   * The tag's text, one entry per rendered line. Use an empty array for
   * image-only tags (the original passed `""`, which `HasText` treated as
   * falsy).
   */
  text: string[];
  /** The tag's anchor element (the original `a`). */
  a: HTMLAnchorElement;
  /** Position on the unit shape, as `[x, y, z]` (the original `v`). */
  position: [number, number, number];
  /** Initial tag width (the original `w`). */
  w: number;
  /** Initial tag height (the original `h`). */
  h: number;
  /** Text color, or `null` to fall back to `opts.textColor` (the original `col`). */
  color: string | null;
  /** Background fill color, or `null` to fall back to `opts.bgColor` (the original `bcol`). */
  bgColor: string | null;
  /** Background corner radius in px (the original `bradius`). */
  bgRadius: number;
  /** Background outline color, or `null` to fall back to the resolved text color (the original `boutline`). */
  bgOutline: string | null;
  /** Background outline thickness in px (the original `bothickness`). */
  bgOutlineThickness: number;
  /** Font family, or `null` to fall back to `opts.textFont` (the original `font`). */
  font: string | null;
  /** Padding around the tag content in px (the original `padding`). */
  padding: number;
  /** The tag element's original text, used by {@link Tag.equalTo} for reconciliation (the original `original`). */
  original: string | null;
}

/**
 * A single tag. Structurally satisfies {@link TagLike} so it can be handed to
 * its own {@link Outline}.
 */
export class Tag implements TagLike {
  // --- TagLike surface (read/mutated by the tag's Outline) ---

  /** The tag's anchor element. Reassigned by the cloud's `UpdateTag`. */
  a: HTMLAnchorElement;
  /** The tag's source bitmap, or `null` for a text-only tag. */
  image: CanvasImage | null = null;
  /** The composited foreground bitmap drawn each frame, or `null` for live text drawing. */
  fimage: CanvasImage | null = null;
  /** The pre-rendered highlight bitmap for the `'color'`/`'size'` outline methods, or `null`. */
  oimage: CanvasImage | null = null;
  /** The alternate image drawn over the active tag when `altImage` is enabled, or `null`. */
  alt: CanvasImage | null = null;
  /** Ratio of the `'size'`-method outline bitmap's size to the base bitmap's size. */
  oscale = 1;
  /** Current draw opacity (0..1). */
  alpha = 1;
  /** The tag's (current) text color. */
  color: string;
  /** Tag width. */
  w: number;
  /** Tag height. */
  h: number;

  // --- Additional public surface used by the cloud ---

  /** The tag's text lines (empty for image-only tags). */
  text: string[];
  /** Tooltip title, from the anchor's `title`; refreshed by `UpdateTag`. */
  title: string | null;
  /** Position on the unit shape; reassigned by the cloud when it re-lays-out. */
  position: Vector;
  /** Projected X (canvas units, relative to cloud center), set each frame by {@link Tag.calc}. */
  x = 0;
  /** Projected Y, set each frame by {@link Tag.calc}. */
  y = 0;
  /** Original (unprojected) depth Z, set each frame by {@link Tag.calc}; the cloud sorts by it. */
  z = 0;
  /** Perspective scale factor for this tag, set each frame by {@link Tag.calc}. */
  sc = 1;

  // --- Internal state ---

  private readonly ctx: CloudContext;
  /** The tag's highlight outline. */
  private readonly outline: Outline;
  /** The rotation-transformed position from the last {@link Tag.calc}; also its return value. */
  private xformed: Vector = new Vector(0, 0, 0);
  /** Standard image width with `imageScale` applied (the original `iw`). */
  private iw = 0;
  /** Standard image height with `imageScale` applied (the original `ih`). */
  private ih = 0;
  /** Current text height in px; mutated by size weighting. */
  private textHeight = 0;
  /** CSS font shorthand used for live text drawing, built in {@link Tag.measure}. */
  private font = '';
  /** Measured width of each text line, filled by {@link Tag.measure}. */
  private readonly lineWidths: number[] = [];
  /** Background fill color, or `null`. */
  private bgColor: string | null;
  /** Background corner radius in px. */
  private bgRadius: number;
  /** Background outline color, or `null`. */
  private bgOutline: string | null;
  /** Background outline thickness in px. */
  private bgOutlineThickness: number;
  /** Font family for this tag. */
  private textFont: string;
  /** Padding around the tag content in px. */
  private padding: number;
  /** The element's original text, compared by {@link Tag.equalTo}. */
  private readonly textOriginal: string | null;

  /** The tag's own `<audio>` element, or `null` (the original `this.audio`). */
  private audioElement: HTMLAudioElement | null = null;
  /** The tag's own audio track, created lazily on first play (the original `this.track`). */
  private track: AudioTrack | null = null;
  /** Whether playback was stopped (guards the async `play()` resolution). */
  private stopped = false;
  /** Whether the tag's own audio is currently playing. */
  private playing = false;

  constructor(ctx: CloudContext, init: TagInit) {
    const opts = ctx.opts;
    this.ctx = ctx;
    this.text = init.text;
    this.textOriginal = init.original;
    this.a = init.a;
    this.title = init.a.title || null;
    this.position = new Vector(init.position[0], init.position[1], init.position[2]);
    this.w = init.w;
    this.h = init.h;
    this.color = init.color || opts.textColor || '';
    this.bgColor = init.bgColor || opts.bgColor;
    this.bgRadius = init.bgRadius | 0;
    this.bgOutline = init.bgOutline || this.color;
    this.bgOutlineThickness = init.bgOutlineThickness | 0;
    this.textFont = init.font || opts.textFont || '';
    this.padding = init.padding | 0;
    this.outline = new Outline(ctx, this);
  }

  /** Whether the tag has any non-empty text line (the original `HasText`). */
  hasText(): boolean {
    return this.text.length > 0 && this.text[0].length > 0;
  }

  /**
   * Finishes setting up the tag after its content is known: measures text (or
   * adopts the image dimensions) and derives draw state. Ported from `Init`;
   * the `SetShadowColour`/`SetDraw` method binding it performed is now
   * handled by direct reads and runtime dispatch.
   */
  init(): void {
    this.textHeight = this.ctx.opts.textHeight;
    if (this.hasText()) {
      this.measure();
    } else {
      this.w = this.iw;
      this.h = this.ih;
    }
  }

  /** Adopts a loaded image as the tag's bitmap. Ported from `SetImage`. */
  setImage(image: CanvasImage): void {
    this.image = this.fimage = image;
  }

  /** Attaches a tag-local `<audio>` element and starts loading it. Ported from `SetAudio`. */
  setAudio(element: HTMLAudioElement): void {
    this.audioElement = element;
    element.load();
  }

  /**
   * Compares this tag against an anchor element, for reconciliation on reload.
   * Ported from `EqualTo`; `innerText` becomes `textContent`.
   *
   * @param e - the candidate anchor
   * @returns whether they represent the same tag
   */
  equalTo(e: HTMLAnchorElement): boolean {
    if (this.a.href !== e.href) {
      return false;
    }
    const imgs = e.getElementsByTagName('img');
    if (imgs.length) {
      // A rounded/composited image is a canvas with no `src`; that mismatches
      // any element `src`, exactly as the original's `undefined == src` did.
      const src = this.image instanceof HTMLImageElement ? this.image.src : null;
      return src === imgs[0].src;
    }
    return e.textContent === this.textOriginal;
  }

  /**
   * Re-applies font/colors and re-measures. Ported from `SetFont`.
   * `bgOutline` may be `null` (the original assigned it verbatim, without the
   * constructor's `|| color` fallback).
   */
  setFont(font: string, color: string, bgColor: string | null, bgOutline: string | null): void {
    this.textFont = font;
    this.color = color;
    this.bgColor = bgColor;
    this.bgOutline = bgOutline;
    this.measure();
  }

  /**
   * Applies the cloud's per-source weights to this tag. Ported from
   * `SetWeight`. The legacy `tc.weightMode.split(...)` DSL is replaced by the
   * pre-normalized `opts.weightModes` array.
   *
   * @param weights - one weight per weighting pass (`weightFrom` source)
   */
  setWeight(weights: number[]): void {
    if (!this.hasText()) {
      return;
    }
    const ctx = this.ctx;
    const modes = ctx.opts.weightModes;
    for (let s = 0; s < weights.length; ++s) {
      const m = modes[s] || 'size';
      if (m === 'both') {
        this.weight(weights[s], 'size', ctx.minWeight[s], ctx.maxWeight[s], s);
        this.weight(weights[s], 'color', ctx.minWeight[s], ctx.maxWeight[s], s);
      } else {
        this.weight(weights[s], m, ctx.minWeight[s], ctx.maxWeight[s], s);
      }
    }
    this.measure();
  }

  /**
   * Applies one weighting pass. Ported from `Weight`; the color
   * mode keys `'colour'`/`'bgcolour'` become `'color'`/`'bgcolor'`.
   */
  private weight(w: number, mode: WeightMode, wmin: number, wmax: number, wnum: number): void {
    const opts = this.ctx.opts;
    const weight = isNaN(w) ? 1 : w;
    const nweight = (weight - wmin) / (wmax - wmin);
    if (mode === 'color') {
      this.color = this.ctx.gradientColor(nweight, wnum);
    } else if (mode === 'bgcolor') {
      this.bgColor = this.ctx.gradientColor(nweight, wnum);
    } else if (mode === 'bgoutline') {
      this.bgOutline = this.ctx.gradientColor(nweight, wnum);
    } else if (mode === 'outline') {
      this.outline.color = this.ctx.gradientColor(nweight, wnum);
    } else if (mode === 'size') {
      const wsMin = opts.weightSizeMin;
      const wsMax = opts.weightSizeMax;
      if (wsMin !== null && wsMin > 0 && wsMax !== null && wsMax > wsMin) {
        this.textHeight = opts.weightSize * (wsMin + (wsMax - wsMin) * nweight);
      } else {
        // min textHeight of 1
        this.textHeight = Math.max(1, weight * opts.weightSize);
      }
    }
  }

  /** Measures each text line, caching per-line widths. Ported from `MeasureText`. */
  private measureText(c: CanvasRenderingContext2D): number {
    let w = 0;
    for (let i = 0; i < this.text.length; ++i) {
      const wl = c.measureText(this.text[i]).width;
      this.lineWidths[i] = wl;
      w = Math.max(w, wl);
    }
    return w;
  }

  /**
   * Measures the tag's text and, when `txtOpt` is on, pre-renders it (plus any
   * image and highlight variants) to bitmaps. Ported from `Measure`. The
   * legacy `t.txtOpt` write-back becomes a write to
   * {@link CloudContext.txtOptActive}.
   */
  private measure(): void {
    const ctx = this.ctx;
    const opts = ctx.opts;
    const c = ctx.ctxt;
    let extents = findTextBoundingBox(this.text, this.textFont, this.textHeight);
    // add the gap at the top to the height to make an equal gap at the bottom
    let theight = extents.max.y + extents.min.y;
    c.font = this.font = this.textHeight + 'px ' + this.textFont;
    let twidth = this.measureText(c);
    if (opts.txtOpt) {
      const s = opts.txtScale;
      let th = s * this.textHeight;
      let f = th + 'px ' + this.textFont;
      const soff: Offset2D = [s * opts.shadowOffset[0], s * opts.shadowOffset[1]];
      c.font = f;
      let cw = this.measureText(c);
      let tcv = new TextCanvas(
        this.text, f, cw + s, (s * theight) + s, cw, this.lineWidths,
        opts.textAlign, opts.textVAlign, s,
      );
      if (this.image) {
        tcv.setImage(
          this.image, this.iw, this.ih, opts.imagePosition, opts.imagePadding,
          opts.imageAlign, opts.imageVAlign, opts.imageScale,
        );
      }
      let img: CanvasImage = tcv.create(
        this.color, this.bgColor, this.bgOutline ?? '', s * this.bgOutlineThickness,
        ctx.shadowColor, s * opts.shadowBlur, soff, s * this.padding, s * this.bgRadius,
      );

      // add outline image using the highlight color
      if (opts.outlineMethod === 'color') {
        this.oimage = tcv.create(
          this.outline.color, this.bgColor, this.outline.color, s * this.bgOutlineThickness,
          ctx.shadowColor, s * opts.shadowBlur, soff, s * this.padding, s * this.bgRadius,
        );
      } else if (opts.outlineMethod === 'size') {
        extents = findTextBoundingBox(this.text, this.textFont, this.textHeight + opts.outlineIncrease);
        th = extents.max.y + extents.min.y;
        f = (s * (this.textHeight + opts.outlineIncrease)) + 'px ' + this.textFont;
        c.font = f;
        cw = this.measureText(c);
        tcv = new TextCanvas(
          this.text, f, cw + s, (s * th) + s, cw, this.lineWidths,
          opts.textAlign, opts.textVAlign, s,
        );
        if (this.image) {
          tcv.setImage(
            this.image, this.iw + opts.outlineIncrease, this.ih + opts.outlineIncrease,
            opts.imagePosition, opts.imagePadding, opts.imageAlign, opts.imageVAlign, opts.imageScale,
          );
        }
        let oimage: CanvasImage = tcv.create(
          this.color, this.bgColor, this.bgOutline ?? '', s * this.bgOutlineThickness,
          ctx.shadowColor, s * opts.shadowBlur, soff, s * this.padding, s * this.bgRadius,
        );
        this.oscale = oimage.width / img.width;
        if (opts.outlineIncrease > 0) {
          img = expandImage(img, oimage.width, oimage.height);
        } else {
          oimage = expandImage(oimage, img.width, img.height);
        }
        this.oimage = oimage;
      }

      // `create` always yields a canvas, so `img` is always adopted here.
      this.fimage = img;
      twidth = this.fimage.width / s;
      theight = this.fimage.height / s;
      ctx.txtOptActive = this.fimage !== null;
    }
    this.h = theight;
    this.w = twidth;
  }

  /**
   * Post-load image processing: scaling, rounding, shadow/background/outline
   * bitmap generation, then {@link Tag.init}. Ported from `AddImage`; waits
   * for the images to load via `addEventListener` (guarded by
   * {@link CloudContext.destroyed}) instead of `AddHandler`.
   *
   * @param image - the cloned working image (already stored via {@link Tag.setImage}); the original `i`
   * @param source - the source `<img>` element the tag was built from; the original `o`
   * @param alt - the alternate `<img>`, or `null`; the original `alt`
   */
  attachImage(image: HTMLImageElement, source: HTMLImageElement, alt: HTMLImageElement | null): void {
    const ctx = this.ctx;
    const opts = ctx.opts;

    // Wait for every image to finish loading before measuring it. `error`
    // resumes the same way `load` does: a broken URL never fires `load`, so
    // waiting only on that would leave the tag holding an unusable image.
    const pending = [source, image, alt].find((el): el is HTMLImageElement => el !== null && !el.complete);
    if (pending) {
      // Hold no image until it is known to be usable. A tag that adopts one
      // mid-load ends up drawing it the moment it breaks, and the resulting
      // exception aborts the whole frame — taking every other tag with it.
      this.image = this.fimage = null;
      const resume = (): void => {
        if (ctx.destroyed) {
          return;
        }
        this.attachImage(image, source, alt);
      };
      pending.addEventListener('load', resume, { once: true, signal: ctx.signal });
      pending.addEventListener('error', resume, { once: true, signal: ctx.signal });
      return;
    }

    // Drawing an image that failed to load throws `InvalidStateError` on every
    // frame, so drop it and let the tag fall back to its text. A broken alt
    // image only costs the hover swap.
    if (isImageBroken(image) || isImageBroken(source)) {
      this.image = this.fimage = null;
      this.alt = null;
      this.init();
      return;
    }
    this.image = this.fimage = image;
    const altImage = alt !== null && !isImageBroken(alt) ? alt : null;

    const size = resolveImageSize(source);
    if (source.getClientRects().length > 0) {
      // Only stamp the size back onto the source element while it is being
      // rendered, where the values reflect the applied CSS. This is what makes
      // proportional sizes survive the element being hidden and reused for
      // another cloud (as in the original). Writing them when the element is
      // *not* rendered would burn the intrinsic size into the caller's markup,
      // overriding their CSS and breaking the aspect ratio.
      source.width = size.width;
      source.height = size.height;
    }

    const s = opts.imageScale;
    if (s) {
      image.width = size.width * s;
      image.height = size.height * s;
    }
    // the standard width/height of the image, with imageScale applied
    this.iw = image.width;
    this.ih = image.height;

    if (opts.txtOpt) {
      let baseImage: CanvasImage = image; // tracks `this.image`, known non-null
      let fimage: CanvasImage = image; // tracks `this.fimage`, known non-null
      let mscale = opts.zoomMax * opts.txtScale;
      let iw = this.iw * mscale;
      let ih = this.ih * mscale;
      if (iw < source.naturalWidth || ih < source.naturalHeight) {
        fimage = scaleImage(image, iw, ih);
        this.fimage = fimage;
      } else {
        iw = this.iw;
        ih = this.ih;
        mscale = 1;
      }
      if (parseFloat(opts.imageRadius)) {
        baseImage = roundImage(baseImage, opts.imageRadius, iw, ih, mscale);
        fimage = baseImage;
        this.image = this.fimage = baseImage;
      }
      if (!this.hasText()) {
        if (ctx.shadowColor) {
          const shadowed = addShadowToImage(
            baseImage, iw, ih, mscale, ctx.shadowColor, opts.shadowBlur, opts.shadowOffset,
          );
          fimage = shadowed.image;
          this.fimage = fimage;
          this.w = shadowed.width;
          this.h = shadowed.height;
        }
        if (opts.bgColor || opts.bgOutlineThickness) {
          const bc = opts.bgColor === 'tag' ? getStyleProperty(this.a, 'background-color') : opts.bgColor;
          const oc =
            opts.bgOutline === 'tag'
              ? getStyleProperty(this.a, 'color')
              : opts.bgOutline || opts.textColor;
          iw = fimage.width;
          ih = fimage.height;
          if (opts.outlineMethod === 'color') {
            // create the outline version first, using the current image state
            const outlined = addBackgroundToImage(
              fimage, iw, ih, mscale, bc, opts.bgOutlineThickness, this.outline.color,
              opts.padding, opts.bgRadius, true,
            );
            this.oimage = outlined.image;
          }
          const backed = addBackgroundToImage(
            fimage, iw, ih, mscale, bc, opts.bgOutlineThickness, oc,
            opts.padding, opts.bgRadius,
          );
          fimage = backed.image;
          this.fimage = fimage;
          this.w = backed.width;
          this.h = backed.height;
        }
        if (opts.outlineMethod === 'size') {
          if (opts.outlineIncrease > 0) {
            this.iw += 2 * opts.outlineIncrease;
            this.ih += 2 * opts.outlineIncrease;
            iw = mscale * this.iw;
            ih = mscale * this.ih;
            const scaled = scaleImage(fimage, iw, ih);
            this.oimage = scaled;
            this.fimage = expandImage(fimage, scaled.width, scaled.height);
          } else {
            iw = mscale * (this.iw + 2 * opts.outlineIncrease);
            ih = mscale * (this.ih + 2 * opts.outlineIncrease);
            const scaled = scaleImage(fimage, iw, ih);
            this.oimage = expandImage(scaled, fimage.width, fimage.height);
          }
        }
      }
    }
    this.alt = altImage;
    this.init();
  }

  /**
   * Transforms and projects the tag for the current frame, updating its
   * position, scale and alpha. Ported from `Calc`.
   *
   * @param m - the cloud's current rotation matrix
   * @param a - the frame's base alpha (fade-in factor)
   * @returns the rotation-transformed position
   */
  calc(m: Matrix, a: number): Vector {
    const opts = this.ctx.opts;
    const mnb = opts.minBrightness;
    const mxb = opts.maxBrightness;
    const r = this.ctx.maxRadius;
    const pp = m.xform(this.position);
    this.xformed = pp;
    const proj = project(pp, this.ctx.radius, this.ctx.z1, this.ctx.z2, opts.stretchX, opts.stretchY);
    this.x = proj.x;
    this.y = proj.y;
    this.z = proj.z;
    this.sc = proj.w;
    this.alpha = a * clamp(mnb + ((mxb - mnb) * (r - this.z)) / (2 * r), 0, 1);
    return this.xformed;
  }

  /**
   * Recomputes the tag's outline box from its projected geometry and returns
   * the outline. Ported from `UpdateActive`; the unused context
   * argument is dropped.
   */
  updateActive(xoff: number, yoff: number): Outline {
    const w = this.w;
    const h = this.h;
    const x = this.x - w / 2;
    const y = this.y - h / 2;
    this.outline.update(x, y, w, h, this.sc, this.z, xoff, yoff);
    return this.outline;
  }

  /**
   * Returns the tag's outline if the pointer is over it, else `null`. Ported
   * from `CheckActive`; the `noSelect` option replaces the original
   * `SetDraw`-time swap of `CheckActive` for a no-op.
   */
  checkActive(xoff: number, yoff: number): Outline | null {
    if (this.ctx.opts.noSelect) {
      return null;
    }
    const o = this.updateActive(xoff, yoff);
    return o.active(this.ctx.mx, this.ctx.my) ? o : null;
  }

  /**
   * Follows the tag's link. Ported from `Clicked` and modernized: a targeted
   * link opens a window; otherwise a real `click` `MouseEvent` is dispatched
   * and navigation proceeds unless it was cancelled.
   */
  clicked(): void {
    const a = this.a;
    const target = a.target;
    const href = a.href;
    if (target !== '' && target !== '_self') {
      window.open(href, target);
      return;
    }
    if (a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))) {
      window.location.href = href;
    }
  }

  /**
   * Draws the tag, dispatching to image or text rendering based on whether a
   * foreground bitmap exists. Replaces the original's `SetDraw`-bound `Draw`.
   */
  draw(c: CanvasRenderingContext2D, xoff: number, yoff: number, im?: CanvasImage | null): void {
    if (this.fimage) {
      this.drawImage(c, xoff, yoff, im);
    } else {
      this.drawText(c, xoff, yoff);
    }
  }

  /** Draws the tag's live text. Ported from `DrawText`; `'centre'` becomes `'center'`. */
  private drawText(c: CanvasRenderingContext2D, xoff: number, yoff: number): void {
    const opts = this.ctx.opts;
    const s = this.sc;
    let x = this.x;
    let y = this.y;
    c.globalAlpha = this.alpha;
    c.fillStyle = this.color;
    if (this.ctx.shadowColor) {
      c.shadowColor = this.ctx.shadowColor;
    }
    c.font = this.font;
    x += xoff / s;
    y += yoff / s - this.h / 2;
    for (let i = 0; i < this.text.length; ++i) {
      let xl = x;
      if (opts.textAlign === 'right') {
        xl += this.w / 2 - this.lineWidths[i];
      } else if (opts.textAlign === 'center') {
        xl -= this.lineWidths[i] / 2;
      } else {
        xl -= this.w / 2;
      }
      c.setTransform(s, 0, 0, s, s * xl, s * y);
      c.fillText(this.text[i], 0, 0);
      y += this.textHeight;
    }
  }

  /**
   * Draws a bitmap for the tag. Ported from `DrawImage`; the removed IE
   * variant (`DrawImageIE`) and the always-inert per-tag shadow branch (the
   * original read `this.shadow`, a field it never set) are both gone — image
   * shadows are baked in by {@link Tag.attachImage}.
   */
  drawImage(c: CanvasRenderingContext2D, xoff: number, yoff: number, im?: CanvasImage | null): void {
    const i = im ?? this.fimage;
    const s = this.sc;
    const w = this.w;
    const h = this.h;
    let x = this.x;
    let y = this.y;
    c.globalAlpha = this.alpha;
    x += xoff / s - w / 2;
    y += yoff / s - h / 2;
    c.setTransform(s, 0, 0, s, s * x, s * y);
    if (i) {
      c.drawImage(i, 0, 0, w, h);
    }
  }

  /**
   * Stops the tag's own audio and marks it stopped. Ported from `StopAudio`.
   */
  stopAudio(): void {
    if (this.audioElement && this.playing) {
      this.audioElement.pause();
    }
    this.stopped = true;
    this.playing = false;
  }

  /**
   * Plays the tag's audio (its own `<audio>`, or the cloud's `activeAudio`
   * track). Ported from `PlayAudio` onto `platform/audio.ts`.
   *
   * @returns whether an audio track was engaged (truthy result tells the cloud
   *   to record this tag as the current audio source)
   */
  playAudio(): boolean {
    if (this.ctx.audioOff) {
      return false;
    }
    const ac = getAudioContext();
    if (!ac) {
      return false;
    }

    // Default to the cloud-level activeAudio track; a tag with its own <audio>
    // uses (and lazily creates) its own track instead.
    let track = this.ctx.activeAudioTrack;
    if (this.audioElement) {
      if (!this.track) {
        this.track = createTrack(this.audioElement);
      }
      track = this.track;
      if (track && !this.audioElement.paused) {
        return true;
      }
    }

    if (track) {
      if (ac.state === 'suspended') {
        ac.resume();
      }
      if (ac.state === 'suspended') {
        return false;
      }
      const element = track.element;
      track.gain.gain.value = Math.min(2, Math.max(0, this.ctx.audioVolume));
      element.currentTime = 0;
      this.stopped = false;
      const p = element.play();
      if (p !== undefined) {
        p.then(() => {
          if (this.stopped) {
            // Pause the tag's own element if it has one (matches the original,
            // which paused `this.audio`); the shared track is left for the next tag.
            this.audioElement?.pause();
          } else {
            this.playing = true;
          }
        }).catch(() => {
          // Autoplay may be rejected until the user interacts; ignore.
        });
      }
      return true;
    }
    return false;
  }
}
