import type { CloudContext } from '@/core/cloud-context.js';
import type { ResolvedOptions, TagCanvasOptions } from '@/core/options.js';
import { resolveOptions, fixFont } from '@/core/options.js';
import type { AudioTrack } from '@/platform/audio.js';
import { createTrack, disposeTrack, drawAudioIcon, getAudioContext } from '@/platform/audio.js';
import { Matrix } from '@/math/matrix.js';
import { Vector, makeVector } from '@/math/vector.js';
import { clamp, shuffle } from '@/math/utils.js';
import { shapes } from '@/math/shapes.js';
import { absPos, canvasXY, findWeight, getStyleProperty } from '@/platform/dom.js';
import { GradientCache } from '@/render/gradient.js';
import { TextSplitter } from '@/render/text-splitter.js';
import { Tag } from '@/core/tag.js';
import type { Outline } from '@/core/outline.js';
import type {
  CenterFunc,
  Offset2D,
  RotateTagOptions,
  ShapePointGenerator,
  TagSelector,
  TagToFrontOptions,
  TooltipMode,
} from '@/types.js';

/**
 * Rotation-speed scale factor applied to the frame delta. Replaces the original
 * `tdelta = elapsedMs * interval/1000`, where the first instance's `interval`
 * was shared globally. `0.02` = the default `interval` of `20` divided by
 * `1000`, preserving the original rotation-speed feel.
 */
const TIME_SCALE = 0.02;

/**
 * Minimum rotation speed below which momentum snaps to zero during deceleration
 * (legacy `z0` option / internal `tc.z0`).
 */
const Z0 = 0.0002;

/** In-flight "rotate a tag to a target orientation" animation (legacy `tc.fixedAnim`). */
interface FixedAnim {
  /** Signed rotation angle to sweep, in radians. */
  angle: number;
  /** Rotation axis (unit vector). */
  axis: Vector;
  /** Animation duration in milliseconds. */
  t: number;
  /** Start timestamp (`performance.now()`). */
  t0: number;
  /** Completion callback, or `undefined`. */
  cb: (() => void) | undefined;
  /** The tag being rotated. */
  tag: Tag;
  /** Whether to keep the tag shown active during the rotation. */
  active: boolean | undefined;
  /** Transform captured at animation start, filled on the first frame. */
  transform?: Matrix;
}

/** An HTML5 canvas-based 3D tag cloud. */
export class TagCanvas implements CloudContext {
  // --- CloudContext / public surface ---

  readonly canvas: HTMLCanvasElement;
  readonly ctxt: CanvasRenderingContext2D;
  readonly opts: ResolvedOptions;
  readonly z1: number;
  readonly radius: number;
  readonly signal: AbortSignal;
  /** Reference shape radius for brightness falloff; `100`, then `max(rx, ry, rz)` after layout. */
  maxRadius = 100;
  /** Pointer X in canvas pixels, or `-1` when outside the canvas. */
  mx = -1;
  /** Pointer Y in canvas pixels, or `-1` when outside the canvas. */
  my = -1;
  /** Resolved text shadow color, or `null` when no shadow is configured. */
  shadowColor: string | null = null;
  /** Whether tags currently render as pre-baked bitmaps (mutated by `Tag.measure`). */
  txtOptActive: boolean;
  /** Per-pass minimum tag weight, filled by the weighting step. */
  minWeight: number[] = [];
  /** Per-pass maximum tag weight, filled by the weighting step. */
  maxWeight: number[] = [];
  /** Whether audio playback is muted for this cloud. */
  audioOff = false;
  /** The cloud-level `activeAudio` track, or `null`. */
  activeAudioTrack: AudioTrack | null = null;
  /** Live playback volume (written by {@link TagCanvas.setVolume}). */
  audioVolume: number;

  // --- Perspective / rotation ---

  /** Perspective far-plane distance, `z1 / zoomLevel` (dynamic; legacy `tc.z2`). */
  get z2(): number {
    return this.z1 / this.#zoomLevel;
  }

  #zoomLevel: number;
  #gradientCache: GradientCache | null = null;
  #transform: Matrix;
  #taglist: Tag[] = [];
  #listLength = 0;
  #time = 0;
  #startTime = 0;
  #yaw = 0;
  #pitch = 0;
  #dx = 0;
  #dy = 0;
  #frozen = false;
  #drawn = false;
  #fixedAnim: FixedAnim | null = null;
  #fixedAlpha = 1;
  #fadeIn: number;
  #fixedCallback: (() => void) | null = null;
  #active: Outline | null = null;
  #activeTag: Tag | null = null;
  #currentAudio: Tag | null = null;
  #touchState = 0;
  #down: { x: number; y: number } | null = null;
  #dragging = false;
  #pinched: [number, number] | null = null;
  #preFreeze: [number, number] = [0, 0];
  #initial: Offset2D | null;
  #shapeFn: ShapePointGenerator;
  #shapeExtraArgs: number[];
  #laidOut = false;
  #repeatTags: number;
  #centerFunc: CenterFunc | null;

  // --- Tooltip / audio / lifecycle ---

  #ctitle = '';
  #ttdiv: HTMLDivElement | null = null;
  #tttimer: number | null = null;
  #tooltipMode: TooltipMode;
  #hasAudio = false;
  #paused: boolean;
  #destroyed = false;
  #rafId: number | null = null;
  #scrollTimer: number | null = null;
  #ac: AbortController;

  /**
   * @param canvas - the target `<canvas>`, or a CSS selector resolving to one
   * @param options - cloud options (see {@link TagCanvasOptions})
   * @throws if the selector matches nothing, the element is not a canvas, or a
   *   2D context cannot be acquired
   */
  constructor(canvas: HTMLCanvasElement | string, options?: TagCanvasOptions) {
    const el = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    if (!el) {
      throw new Error(`TagCanvas: no element found for selector "${canvas}".`);
    }
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error('TagCanvas: the target element is not a <canvas>.');
    }
    const ctxt = el.getContext('2d');
    if (!ctxt) {
      throw new Error('TagCanvas: could not acquire a 2D context from the canvas.');
    }

    const opts = resolveOptions(options);
    this.opts = opts;
    this.canvas = el;
    this.ctxt = ctxt;
    ctxt.textBaseline = 'top';

    this.z1 = 250 / Math.max(opts.depth, 0.001);
    this.radius = Math.min(el.height, el.width) * 0.0075;
    this.#zoomLevel = opts.zoom;
    this.audioVolume = opts.audioVolume;
    this.txtOptActive = opts.txtOpt;
    this.#fadeIn = opts.fadeIn;
    this.#transform = Matrix.identity();
    this.#time = this.#startTime = performance.now();
    this.#initial = opts.initial;
    this.#yaw = this.#initial ? this.#initial[0] * opts.maxSpeed : 0;
    this.#pitch = this.#initial ? this.#initial[1] * opts.maxSpeed : 0;
    this.#centerFunc = opts.centerFunc;
    this.#ac = new AbortController();
    this.signal = this.#ac.signal;
    this.#paused = opts.paused;

    // Resolve the text shadow color once: let the browser normalize the color,
    // or use `null` for "no shadow" (the state the original expressed by
    // `delete this.shadow`).
    if (opts.shadowBlur || opts.shadowOffset[0] || opts.shadowOffset[1]) {
      ctxt.shadowColor = opts.shadow;
      this.shadowColor = ctxt.shadowColor;
    } else {
      this.shadowColor = null;
    }

    // Resolve the shape to runtime fields, never writing back to the frozen
    // options.
    this.#shapeFn = typeof opts.shape === 'function' ? opts.shape : shapes[opts.shape] ?? shapes.sphere;
    this.#shapeExtraArgs = opts.shapeArgs;

    // Reverse-compute repeatTags from minTags.
    this.#repeatTags = opts.repeatTags;
    if (opts.minTags > 0 && this.#repeatTags < 1) {
      const n = this.#getTags().length;
      if (n) {
        this.#repeatTags = Math.ceil(opts.minTags / n) - 1;
      }
    }

    if (opts.centerImage) {
      this.#loadCenterImage(opts.centerImage);
    }

    // `activeAudio === false` disables audio for this cloud (per-instance,
    // replacing the old global `audio = 'off'`).
    if (opts.activeAudio === false) {
      this.audioOff = true;
    } else if (opts.activeAudio) {
      this.#loadAudio();
    }

    this.#load();

    // Hide the source markup once ready — but never the canvas itself (matching
    // the original's `lctr &&` guard).
    if (opts.tagContainer !== null && opts.hideTags) {
      if (document.readyState === 'complete') {
        this.#hideTags();
      } else {
        window.addEventListener('load', () => this.#hideTags(), { once: true, signal: this.signal });
      }
    }

    // Tooltip setup.
    if (opts.tooltip) {
      this.#ctitle = el.title;
      el.title = '';
      this.#tooltipMode = opts.tooltip;
      if (opts.tooltip === 'div') {
        const div = document.createElement('div');
        div.className = opts.tooltipClass;
        div.style.position = 'absolute';
        // Coerce before adding: `el.style.zIndex` is a string, so `+ 1` would
        // concatenate ("100" -> "1001"). An empty/unset value still yields "1".
        div.style.zIndex = String(Number(el.style.zIndex || 0) + 1);
        div.addEventListener(
          'mouseover',
          (e) => {
            (e.target as HTMLElement).style.display = 'none';
          },
          { signal: this.signal },
        );
        document.body.appendChild(div);
        this.#ttdiv = div;
      }
    } else {
      this.#tooltipMode = null;
    }

    if (!opts.noMouse) {
      this.#addListeners();
    }

    if (!this.#paused) {
      this.#rafId = requestAnimationFrame(this.#frame);
    }
  }

  // --- Public API ---

  /** Whether the cloud is currently paused. */
  get paused(): boolean {
    return this.#paused;
  }

  /** Whether {@link TagCanvas.destroy} has been called. */
  get destroyed(): boolean {
    return this.#destroyed;
  }

  /** Pauses rotation/animation and stops the animation loop (legacy `Pause`). */
  pause(): void {
    if (this.#destroyed || this.#paused) {
      return;
    }
    this.#paused = true;
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  /**
   * Resumes rotation/animation (legacy `Resume`). The frame clock is
   * reset first so a long pause doesn't produce a large `tdelta` jump.
   */
  resume(): void {
    if (this.#destroyed || !this.#paused) {
      return;
    }
    this.#paused = false;
    this.#time = performance.now();
    if (this.#rafId === null) {
      this.#rafId = requestAnimationFrame(this.#frame);
    }
  }

  /** Rebuilds the whole tag list from the source markup (legacy `Reload` -> `Load`). */
  reload(): void {
    if (this.#destroyed) {
      return;
    }
    this.#load();
  }

  /** Reconciles the tag list against the current source markup (legacy `Update`). */
  update(): void {
    if (this.#destroyed) {
      return;
    }
    this.#updateTags();
  }

  /** Sets the constant background rotation speed (legacy `SetSpeed`). */
  setSpeed(speed: [number, number]): void {
    if (this.#destroyed) {
      return;
    }
    this.#initial = [speed[0], speed[1]];
    this.#yaw = speed[0] * this.opts.maxSpeed;
    this.#pitch = speed[1] * this.opts.maxSpeed;
  }

  /** Sets the zoom level, clamped to `[zoomMin, zoomMax]` (legacy `Zoom`). */
  setZoom(zoom: number): void {
    if (this.#destroyed) {
      return;
    }
    this.#zoomLevel = Math.min(this.opts.zoomMax, Math.max(this.opts.zoomMin, zoom));
    this.#drawn = false;
  }

  /** Sets the audio playback volume (legacy `Volume`). */
  setVolume(volume: number): void {
    if (this.#destroyed) {
      return;
    }
    this.audioVolume = volume;
  }

  /** Toggles audio mute (legacy `ToggleAudio`). */
  toggleAudio(): void {
    if (this.#destroyed) {
      return;
    }
    const ac = getAudioContext();
    const on = this.audioOff || (ac !== null && ac.state === 'suspended');
    if (!on && this.#currentAudio) {
      this.#currentAudio.stopAudio();
    }
    this.audioOff = !on;
  }

  /**
   * Animates the cloud so that a chosen tag rotates to a target orientation
   * (legacy `TagCanvas.RotateTag`).
   *
   * @returns `false` if no tag matches the selector, `true` otherwise
   */
  rotateTag(options: RotateTagOptions): boolean {
    if (this.#destroyed) {
      return false;
    }
    const time = options.time === undefined || isNaN(options.time) ? 500 : options.time;
    const tag = this.#findTag(options.tag);
    if (!tag) {
      return false;
    }
    this.#rotateTagAnim(tag, options.lat, options.lng, time, options.callback, options.active);
    return true;
  }

  /**
   * Animates the cloud so that a chosen tag rotates to the front (legacy
   * `TagCanvas.TagToFront`).
   *
   * @returns `false` if no tag matches the selector, `true` otherwise
   */
  tagToFront(options: TagToFrontOptions): boolean {
    return this.rotateTag({ ...options, lat: 0, lng: 0 });
  }

  /**
   * Tears down the cloud: removes listeners, stops the loop, restores the
   * canvas title, releases audio, clears the canvas, and marks the instance
   * destroyed (all subsequent public calls no-op). Replaces the legacy
   * `TagCanvas.Delete` plus full resource release.
   */
  destroy(): void {
    if (this.#destroyed) {
      return;
    }
    this.#ac.abort();
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    if (this.#tttimer !== null) {
      clearTimeout(this.#tttimer);
      this.#tttimer = null;
    }
    if (this.#scrollTimer !== null) {
      clearTimeout(this.#scrollTimer);
      this.#scrollTimer = null;
    }
    if (this.#ttdiv) {
      this.#ttdiv.remove();
      this.#ttdiv = null;
    }
    this.canvas.title = this.#ctitle;
    if (this.#currentAudio) {
      this.#currentAudio.stopAudio();
      this.#currentAudio = null;
    }
    if (this.activeAudioTrack) {
      disposeTrack(this.activeAudioTrack);
      this.activeAudioTrack = null;
    }
    this.ctxt.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.#taglist = [];
    this.#destroyed = true;
  }

  /** Resolves a weight-gradient color, lazily building the gradient cache. */
  gradientColor(position: number, row: number): string {
    if (!this.#gradientCache) {
      this.#gradientCache = new GradientCache(this.opts.weightGradients);
    }
    return this.#gradientCache.colorAt(position, row);
  }

  // --- Tag collection & construction ---

  /** Resolves the container element(s) the tags are read from (legacy `SourceElements`). */
  #sourceElements(): Element[] {
    const tc = this.opts.tagContainer;
    if (tc === null) {
      return [this.canvas];
    }
    if (typeof tc === 'string') {
      return Array.from(document.querySelectorAll(tc));
    }
    return [tc];
  }

  /** Hides the source markup (legacy `HideTags`). */
  #hideTags(): void {
    for (const el of this.#sourceElements()) {
      (el as HTMLElement).style.display = 'none';
    }
  }

  /** Collects every `<a>` in the container(s), repeated `repeatTags` times (legacy `GetTags`). */
  #getTags(): HTMLAnchorElement[] {
    const containers = this.#sourceElements();
    const tl: HTMLAnchorElement[] = [];
    for (let k = 0; k <= this.#repeatTags; ++k) {
      for (const container of containers) {
        const anchors = container.getElementsByTagName('a');
        for (let j = 0; j < anchors.length; ++j) {
          tl.push(anchors[j]);
        }
      }
    }
    return tl;
  }

  /**
   * Builds a {@link Tag} from an anchor element (legacy `CreateTag`).
   * Returns `undefined` for an anchor that yields neither text nor image.
   */
  #createTag(e: HTMLAnchorElement): Tag | undefined {
    const opts = this.opts;
    const p: [number, number, number] = [0, 0, 0];
    let cloned: HTMLImageElement | undefined;
    let source: HTMLImageElement | undefined;
    let altEl: HTMLImageElement | null = null;
    let ts: TextSplitter | null = null;
    let txt: string[] = [];
    let font: string | null = null;
    let bc: string | null = null;
    let boc: string | null = null;

    if (opts.imageMode !== 'text') {
      const imgs = e.getElementsByTagName('img');
      if (imgs.length) {
        source = imgs[0];
        altEl = imgs[1] ?? null;
        cloned = new Image();
        cloned.src = source.src;
        if (!opts.imageMode) {
          const t = new Tag(this, {
            text: [], a: e, position: p, w: 0, h: 0, color: null, bgColor: null,
            bgRadius: 0, bgOutline: null, bgOutlineThickness: 0, font: null, padding: 0, original: null,
          });
          t.setImage(cloned);
          t.attachImage(cloned, source, altEl);
          this.#addAudio(e, t);
          return t;
        }
      }
    }
    if (opts.imageMode !== 'image') {
      ts = new TextSplitter(e);
      txt = ts.lines();
      if (!ts.empty()) {
        font = opts.textFont || fixFont(getStyleProperty(e, 'font-family'));
        if (opts.splitWidth) {
          txt = ts.splitWidth(opts.splitWidth, this.ctxt, font, opts.textHeight);
        }
        bc = opts.bgColor === 'tag' ? getStyleProperty(e, 'background-color') : opts.bgColor;
        boc = opts.bgOutline === 'tag' ? getStyleProperty(e, 'color') : opts.bgOutline;
      } else {
        ts = null;
      }
    }
    if (ts || cloned) {
      const t = new Tag(this, {
        text: txt,
        a: e,
        position: p,
        w: 2,
        h: opts.textHeight + 2,
        color: opts.textColor || getStyleProperty(e, 'color'),
        bgColor: bc,
        bgRadius: opts.bgRadius,
        bgOutline: boc,
        bgOutlineThickness: opts.bgOutlineThickness,
        font,
        padding: opts.padding,
        original: ts ? ts.original : null,
      });
      if (cloned && source) {
        t.setImage(cloned);
        t.attachImage(cloned, source, altEl);
      } else {
        t.init();
      }
      this.#addAudio(e, t);
      return t;
    }
    return undefined;
  }

  /** Attaches a tag-local `<audio>` element if present (legacy `AddAudio`). */
  #addAudio(e: HTMLAnchorElement, t: Tag): void {
    if (this.audioOff) {
      return;
    }
    const au = e.getElementsByTagName('audio');
    if (au.length) {
      t.setAudio(au[0]);
      this.#hasAudio = true;
    }
  }

  /** Refreshes a reused tag's element/colors/font on reconciliation (legacy `UpdateTag`). */
  #updateTag(t: Tag, a: HTMLAnchorElement): void {
    const opts = this.opts;
    const color = opts.textColor || getStyleProperty(a, 'color');
    const font = opts.textFont || fixFont(getStyleProperty(a, 'font-family'));
    const bc = opts.bgColor === 'tag' ? getStyleProperty(a, 'background-color') : opts.bgColor;
    const boc = opts.bgOutline === 'tag' ? getStyleProperty(a, 'color') : opts.bgOutline;
    t.a = a;
    t.title = a.title;
    // The original re-fonted only when a color/font/bg field differed; those
    // fields are private to `Tag`, so we re-font any text tag unconditionally
    // (`setFont` is idempotent for unchanged values) and skip text-less image
    // tags (whose `setFont` would re-measure empty text to no visible effect).
    if (t.hasText()) {
      t.setFont(font, color, bc, boc);
    }
  }

  /**
   * Builds the fallback "No tags" pseudo-cloud shown when there are no tags
   * (legacy `Message`).
   */
  #message(text: string): Tag[] {
    const tl: Tag[] = [];
    const chars = text.split('');
    for (let i = 0; i < chars.length; ++i) {
      if (chars[i] !== ' ') {
        const rel = i - chars.length / 2;
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = chars[i];
        const x = 100 * Math.sin(rel / 9);
        const z = -100 * Math.cos(rel / 9);
        const t = new Tag(this, {
          text: [chars[i]], a, position: [x, 0, z], w: 2, h: 18, color: '#000', bgColor: '#fff',
          bgRadius: 0, bgOutline: null, bgOutlineThickness: 0, font: 'monospace', padding: 2, original: chars[i],
        });
        t.init();
        tl.push(t);
      }
    }
    return tl;
  }

  // --- Load / update / weight ---

  /** (Re)builds the tag list and lays it out on the shape (legacy `Load`). */
  #load(): void {
    const opts = this.opts;
    const tl = this.#getTags();
    let taglist: Tag[] = [];

    if (tl.length) {
      const tagmap: number[] = [];
      for (let i = 0; i < tl.length; ++i) {
        tagmap[i] = i;
      }
      if (opts.shuffleTags) {
        shuffle(tagmap);
      }
      const rx = 100 * opts.radiusX;
      const ry = 100 * opts.radiusY;
      const rz = 100 * opts.radiusZ;
      this.maxRadius = Math.max(rx, Math.max(ry, rz));

      for (let i = 0; i < tl.length; ++i) {
        const t = this.#createTag(tl[tagmap[i]]);
        if (t) {
          taglist.push(t);
        }
      }
      if (opts.weight) {
        this.#weightTags(taglist);
      }

      const vl = this.#shapeFn(taglist.length, rx, ry, rz, ...this.#shapeExtraArgs);
      this.#listLength = taglist.length;
      for (let i = 0; i < taglist.length; ++i) {
        taglist[i].position = new Vector(vl[i][0], vl[i][1], vl[i][2]);
      }
    }
    this.#laidOut = tl.length > 0;

    if (opts.noTagsMessage && !taglist.length) {
      const kind = opts.imageMode && opts.imageMode !== 'both' ? opts.imageMode + ' ' : '';
      taglist = this.#message('No ' + kind + 'tags');
    }
    this.#taglist = taglist;
  }

  /** Reconciles the tag list against the source markup, reusing tags (legacy `Update`). */
  #updateTags(): void {
    const opts = this.opts;
    const tl = this.#getTags();
    if (!this.#laidOut) {
      this.#load();
      return;
    }

    const taglist = this.#taglist;
    const newlist: Tag[] = [];
    const added: number[] = [];
    let removed: number[] = [];

    if (tl.length) {
      const nl0 = (this.#listLength = tl.length);
      const ol = taglist.length;

      // copy existing list, populate "removed"
      for (let i = 0; i < ol; ++i) {
        newlist.push(taglist[i]);
        removed.push(i);
      }

      // find added and removed tags
      for (let i = 0; i < nl0; ++i) {
        let found = 0;
        for (let j = 0; j < ol; ++j) {
          if (taglist[j].equalTo(tl[i])) {
            this.#updateTag(newlist[j], tl[i]);
            found = -1;
            removed[j] = -1;
          }
        }
        if (!found) {
          added.push(i);
        }
      }

      // clean out found tags from the removed list
      for (let i = 0, j = 0; i < ol; ++i) {
        if (removed[j] === -1) {
          removed.splice(j, 1);
        } else {
          ++j;
        }
      }

      // insert new tags into gaps left by removed ones
      if (removed.length) {
        shuffle(removed);
        while (removed.length && added.length) {
          const ri = removed.shift() as number;
          const aj = added.shift() as number;
          const nt = this.#createTag(tl[aj]);
          if (nt) {
            newlist[ri] = nt;
          }
        }
        // remove any remaining (in reverse order)
        removed.sort((a, b) => a - b);
        while (removed.length) {
          newlist.splice(removed.pop() as number, 1);
        }
      }

      // spread any extra tags through the list
      const step = newlist.length / (added.length + 1);
      let ii = 0;
      while (added.length) {
        const nt = this.#createTag(tl[added.shift() as number]);
        if (nt) {
          newlist.splice(Math.ceil(++ii * step), 0, nt);
        }
      }

      // assign shape positions
      const nl = newlist.length;
      const rx = 100 * opts.radiusX;
      const ry = 100 * opts.radiusY;
      const rz = 100 * opts.radiusZ;
      const vl = this.#shapeFn(nl, rx, ry, rz, ...this.#shapeExtraArgs);
      for (let i = 0; i < nl; ++i) {
        newlist[i].position = new Vector(vl[i][0], vl[i][1], vl[i][2]);
      }

      if (opts.weight) {
        this.#weightTags(newlist);
      }
    }
    this.#taglist = newlist;
  }

  /** Computes per-source weights and applies them to the tags (legacy `Weight`). */
  #weightTags(tl: Tag[]): void {
    const opts = this.opts;
    const wfrom = opts.weightFroms;
    const wl = wfrom.length;
    const weights: number[][] = [];
    // Recompute the extrema from scratch: keeping values from an earlier
    // reload()/update() pass would skew the weighting once tags change.
    this.minWeight.length = 0;
    this.maxWeight.length = 0;
    for (let i = 0; i < tl.length; ++i) {
      weights[i] = [];
      for (let s = 0; s < wl; ++s) {
        const w = findWeight(tl[i].a, wfrom[s], opts.textHeight);
        if (!this.maxWeight[s] || w > this.maxWeight[s]) {
          this.maxWeight[s] = w;
        }
        if (!this.minWeight[s] || w < this.minWeight[s]) {
          this.minWeight[s] = w;
        }
        weights[i][s] = w;
      }
    }
    let valid = false;
    for (let s = 0; s < wl; ++s) {
      if (this.maxWeight[s] > this.minWeight[s]) {
        valid = true;
      }
    }
    if (valid) {
      for (let i = 0; i < tl.length; ++i) {
        tl[i].setWeight(weights[i]);
      }
    }
  }

  // --- Rendering ---

  /** The per-instance animation-frame callback. */
  #frame = (t: number): void => {
    this.#draw(t);
    if (!this.#paused && !this.#destroyed) {
      this.#rafId = requestAnimationFrame(this.#frame);
    } else {
      this.#rafId = null;
    }
  };

  /**
   * Renders one frame (legacy `Draw`). The two-list structure is
   * preserved exactly: `tl` is a depth-sorted copy used for drawing, while the
   * unsorted `this.#taglist` drives hit-testing and the tooltip's `aindex`.
   */
  #draw(t: number): void {
    if (this.#paused) {
      return;
    }
    const opts = this.opts;
    const cv = this.canvas;
    const cw = cv.width;
    const ch = cv.height;
    const c = this.ctxt;
    const tdelta = (t - this.#time) * TIME_SCALE;
    const x = cw / 2 + opts.offsetX;
    const y = ch / 2 + opts.offsetY;
    const taglist = this.#taglist; // unsorted
    const l = taglist.length;
    const last = this.#activeTag;
    const frontsel = opts.frontSelect;
    let max_sc = 0;
    let active: Outline | null = null;
    let activeTag: Tag | null = null;
    let aindex = -1;
    let cursor = '';
    let centerDrawn = this.#centerFunc === null;
    this.#time = t;

    if (this.#frozen && this.#drawn) {
      this.#animate(cw, ch, tdelta);
      return;
    }
    const fixed = this.#animateFixed();
    c.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < l; ++i) {
      taglist[i].calc(this.#transform, this.#fixedAlpha);
    }
    const tl = [...taglist].sort((a, b) => b.z - a.z); // depth-sorted draw order

    if (fixed && this.#fixedAnim && this.#fixedAnim.active) {
      activeTag = this.#fixedAnim.tag;
      active = activeTag.updateActive(x, y);
    } else {
      this.#active = null;
      this.#activeTag = null;
      if (this.#checkAudioIcon()) {
        cursor = 'pointer';
      } else {
        for (let i = 0; i < l; ++i) {
          let a: Outline | null = null;
          if (this.mx >= 0 && this.my >= 0) {
            a = taglist[i].checkActive(x, y);
          }
          if (a && a.sc > max_sc && (!frontsel || a.z <= 0)) {
            active = a;
            aindex = i;
            activeTag = taglist[i];
            active.tag = taglist[i];
            max_sc = a.sc;
          }
        }
        this.#active = active;
        this.#activeTag = activeTag;
      }
    }

    if (!this.txtOptActive && this.shadowColor) {
      this.#setShadow(c);
    }
    c.clearRect(0, 0, cw, ch);
    for (let i = 0; i < l; ++i) {
      if (!centerDrawn && tl[i].z <= 0) {
        // run centerFunc just before the first front-facing tag
        try {
          this.#centerFunc?.(c, cw, ch, x, y);
        } catch (e) {
          console.error(e);
          this.#centerFunc = null; // don't run it again
        }
        centerDrawn = true;
      }
      if (!(active && active.tag === tl[i] && active.preDraw(c, tl[i], x, y))) {
        tl[i].draw(c, x, y);
      }
      if (active && active.tag === tl[i]) {
        active.postDraw(c);
      }
    }

    if (opts.freezeActive && active) {
      this.#freeze();
    } else {
      this.#unFreeze();
      this.#drawn = l === this.#listLength;
    }
    if (this.#fixedCallback) {
      this.#fixedCallback();
      this.#fixedCallback = null;
    }
    if (!fixed) {
      this.#animate(cw, ch, tdelta);
    }
    if (active && activeTag) {
      active.lastDraw(c);
      if (activeTag !== last) {
        if (this.#currentAudio && this.#currentAudio !== activeTag) {
          this.#currentAudio.stopAudio();
        }
        if (activeTag.playAudio()) {
          this.#currentAudio = activeTag;
        }
      }
      cursor = opts.activeCursor;
    }
    cv.style.cursor = cursor;
    this.#tooltip(active, taglist[aindex]);
    if (opts.audioIcon) {
      this.#showAudioIcon();
    }
  }

  /** Applies the configured shadow blur/offset to the context (legacy `SetShadow`). */
  #setShadow(c: CanvasRenderingContext2D): void {
    c.shadowBlur = this.opts.shadowBlur;
    c.shadowOffsetX = this.opts.shadowOffset[0];
    c.shadowOffsetY = this.opts.shadowOffset[1];
  }

  // --- Animation ---

  /** Advances the cloud's free rotation for the frame (legacy `Animate` dispatch). */
  #animate(w: number, h: number, t: number): void {
    if (this.opts.dragControl) {
      this.#animateDrag(w, h, t);
    } else {
      this.#animatePosition(w, h, t);
    }
  }

  /** Hover-follow rotation (legacy `AnimatePosition`). */
  #animatePosition(w: number, h: number, t: number): void {
    const opts = this.opts;
    const x = this.mx;
    const y = this.my;
    if (!this.#frozen && x >= 0 && y >= 0 && x < w && y < h) {
      const s = opts.maxSpeed;
      const r = opts.reverse ? -1 : 1;
      if (!opts.lockX) {
        this.#yaw = (x * 2 * s / w - s) * r * t;
      }
      if (!opts.lockY) {
        this.#pitch = (y * 2 * s / h - s) * -r * t;
      }
      this.#initial = null;
    } else if (!this.#initial) {
      if (this.#frozen && !opts.freezeDecel) {
        this.#yaw = this.#pitch = 0;
      } else {
        this.#decel();
      }
    }
    this.#transformCloud(this.#pitch, this.#yaw);
  }

  /** Drag/momentum rotation (legacy `AnimateDrag`). */
  #animateDrag(_w: number, _h: number, t: number): void {
    const opts = this.opts;
    const rs = (100 * t * opts.maxSpeed) / this.maxRadius / this.#zoomLevel;
    if (this.#dx || this.#dy) {
      if (!opts.lockX) {
        this.#yaw = (this.#dx * rs) / opts.stretchX;
      }
      if (!opts.lockY) {
        this.#pitch = (this.#dy * -rs) / opts.stretchY;
      }
      this.#dx = this.#dy = 0;
      this.#initial = null;
    } else if (!this.#initial) {
      this.#decel();
    }
    this.#transformCloud(this.#pitch, this.#yaw);
  }

  /** Composes a pitch/yaw rotation into the cloud transform (legacy `Transform`). */
  #transformCloud(p: number, y: number): void {
    if (p || y) {
      const sp = Math.sin(p);
      const cp = Math.cos(p);
      const sy = Math.sin(y);
      const cy = Math.cos(y);
      const ym = new Matrix([cy, 0, sy, 0, 1, 0, -sy, 0, cy]);
      const pm = new Matrix([1, 0, 0, 0, cp, -sp, 0, sp, cp]);
      this.#transform = this.#transform.mul(ym.mul(pm));
    }
  }

  /**
   * Advances the fade-in and any in-flight rotate-to-target animation (legacy
   * `AnimateFixed`). The easing uses normalized progress
   * (`clamp(t1 / fa.t, 0, 1)`) in place of the original `animTiming(fa.t, t1)`.
   *
   * @returns whether a rotate-to-target animation is currently active
   */
  #animateFixed(): boolean {
    const opts = this.opts;
    if (this.#fadeIn) {
      const t1 = performance.now() - this.#startTime;
      if (t1 >= this.#fadeIn) {
        this.#fadeIn = 0;
        this.#fixedAlpha = 1;
      } else {
        this.#fixedAlpha = t1 / this.#fadeIn;
      }
    }
    const fa = this.#fixedAnim;
    if (fa) {
      if (!fa.transform) {
        fa.transform = this.#transform;
      }
      const t1 = performance.now() - fa.t0;
      let angle = fa.angle;
      const d = opts.easing(clamp(t1 / fa.t, 0, 1));
      this.#transform = fa.transform;
      if (t1 >= fa.t) {
        this.#fixedCallback = fa.cb ?? null;
        this.#fixedAnim = null;
        this.#yaw = this.#pitch = 0;
      } else {
        angle *= d;
      }
      this.#transform = this.#transform.mul(Matrix.rotation(angle, fa.axis));
      return this.#fixedAnim !== null;
    }
    return false;
  }

  /** Freezes rotation, saving the current speed (legacy `Freeze`). */
  #freeze(): void {
    if (!this.#frozen) {
      this.#preFreeze = [this.#yaw, this.#pitch];
      this.#frozen = true;
      this.#drawn = false;
    }
  }

  /** Restores rotation from a freeze (legacy `UnFreeze`). */
  #unFreeze(): void {
    if (this.#frozen) {
      this.#yaw = this.#preFreeze[0];
      this.#pitch = this.#preFreeze[1];
      this.#frozen = false;
    }
  }

  /** Decays rotation speed toward a stop (legacy `Decel`). */
  #decel(): void {
    const opts = this.opts;
    const ay = Math.abs(this.#yaw);
    const ap = Math.abs(this.#pitch);
    if (!opts.lockX && ay > opts.minSpeed) {
      this.#yaw = ay > Z0 ? this.#yaw * opts.decel : 0;
    }
    if (!opts.lockY && ap > opts.minSpeed) {
      this.#pitch = ap > Z0 ? this.#pitch * opts.decel : 0;
    }
  }

  // --- Rotate-to-target ---

  /** Resolves a {@link TagSelector} to a tag (legacy `FindTag`). */
  #findTag(sel: TagSelector): Tag | null {
    if (typeof sel === 'number') {
      return this.#taglist[sel] ?? null;
    }
    if ('index' in sel) {
      return this.#taglist[sel.index] ?? null;
    }
    if ('id' in sel) {
      for (const t of this.#taglist) {
        if (t.a.id === sel.id) {
          return t;
        }
      }
    } else {
      for (const t of this.#taglist) {
        if (t.a.textContent === sel.text) {
          return t;
        }
      }
    }
    return null;
  }

  /** Sets up (or immediately completes) a rotate-to-target animation (legacy `RotateTag`). */
  #rotateTagAnim(
    tag: Tag, lat: number, lng: number, time: number, callback: (() => void) | undefined, active: boolean | undefined,
  ): void {
    const t = tag.calc(this.#transform, 1);
    const v1 = new Vector(t.x, t.y, t.z);
    const v2 = makeVector(lng, lat);
    const angle = v1.angle(v2);
    if (angle === 0) {
      this.#fixedCallback = callback ?? null;
    } else {
      // Antiparallel vectors (`angle` is PI) have a zero-length cross product,
      // which `unit()` turns into NaN. That NaN spreads through the rotation
      // matrix into every tag's coordinates, collapsing the cloud instead of
      // rotating it. Any axis perpendicular to v1 produces the same half-turn,
      // so cross with whichever unit axis v1 is least aligned to.
      let c = v1.cross(v2);
      if (c.length() === 0) {
        const ax = Math.abs(v1.x);
        const ay = Math.abs(v1.y);
        const az = Math.abs(v1.z);
        const fallback =
          ax <= ay && ax <= az
            ? new Vector(1, 0, 0)
            : ay <= az
              ? new Vector(0, 1, 0)
              : new Vector(0, 0, 1);
        c = v1.cross(fallback);
      }
      const u = c.unit();
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y) || !Number.isFinite(u.z)) {
        // No usable axis: the tag sits at the cloud's center, or so close to it
        // that squaring its coordinates in `length()` underflows to zero. Either
        // way no rotation can move the tag, so finish as if it were already in
        // place rather than feeding a non-finite axis into the rotation matrix.
        this.#fixedCallback = callback ?? null;
        return;
      }
      this.#fixedAnim = { angle: -angle, axis: u, t: time, t0: performance.now(), cb: callback, tag, active };
    }
  }

  // --- Input ---

  /** Registers all pointer/scroll listeners against the instance's abort signal (matching the original). */
  #addListeners(): void {
    const c = this.canvas;
    const opts = this.opts;
    const signal = this.signal;
    c.addEventListener('mousemove', this.#onMouseMove, { signal });
    c.addEventListener('mouseout', this.#onMouseOut, { signal });
    c.addEventListener('mouseup', this.#onMouseUp, { signal });
    c.addEventListener('touchstart', this.#onTouchStart, { passive: false, signal });
    c.addEventListener('touchend', this.#onTouchEnd, { signal });
    c.addEventListener('touchcancel', this.#onTouchEnd, { signal });
    c.addEventListener('touchmove', this.#onTouchMove, { passive: false, signal });
    if (opts.dragControl) {
      c.addEventListener('mousedown', this.#onMouseDown, { signal });
      c.addEventListener('selectstart', this.#onSelectStart, { signal });
    }
    if (opts.wheelZoom) {
      c.addEventListener('wheel', this.#onWheel, { passive: false, signal });
    }
    if (opts.scrollPauseMs > 0) {
      window.addEventListener('scroll', this.#onScroll, { signal });
    }
  }

  /** Legacy `MouseOut`. */
  #onMouseOut = (): void => {
    this.mx = this.my = -1;
    this.#unFreeze();
    this.#endDrag();
  };

  /** Legacy `MouseMove`. */
  #onMouseMove = (e: MouseEvent): void => {
    if (this.#tttimer !== null) {
      clearTimeout(this.#tttimer);
      this.#tttimer = null;
    }
    const p = canvasXY(e, this.canvas);
    this.mx = p.x;
    this.my = p.y;
    this.#drag(p);
    this.#drawn = false;
  };

  /** Legacy `MouseDown`; primary button only. */
  #onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.#beginDrag(e, e);
    }
  };

  /** Legacy `MouseUp`. */
  #onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.#onMouseMove(e);
      if (!this.#endDrag() && !this.#touchState) {
        this.#clicked();
      }
    }
  };

  /** Suppresses text selection while dragging (legacy `selectstart` Nop). */
  #onSelectStart = (e: Event): void => {
    e.preventDefault();
  };

  /** Legacy `MouseWheel`; `deltaY < 0` zooms in. */
  #onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.#wheel(e.deltaY < 0);
  };

  /** Legacy `Scroll`; pauses briefly after a page scroll. */
  #onScroll = (): void => {
    if (this.#scrollTimer !== null) {
      clearTimeout(this.#scrollTimer);
    }
    this.pause();
    this.#scrollTimer = setTimeout(() => {
      this.#scrollTimer = null;
      this.resume();
    }, this.opts.scrollPauseMs);
  };

  /** Legacy `TouchDown`. */
  #onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1 && this.#touchState === 0) {
      this.#touchState = 1;
      this.#beginDrag(e.changedTouches[0], e);
      const p = canvasXY(e.changedTouches[0], this.canvas);
      this.mx = p.x;
      this.my = p.y;
      this.#drawn = false;
    } else if (e.targetTouches.length === 2 && this.opts.pinchZoom) {
      this.#touchState = 3;
      this.#endDrag();
      this.#beginPinch(e);
    } else {
      this.#endDrag();
      this.#endPinch();
      this.#touchState = 0;
    }
  };

  /** Legacy `TouchUp`. */
  #onTouchEnd = (): void => {
    switch (this.#touchState) {
      case 1:
        this.#draw(performance.now());
        this.#clicked();
        break;
      case 2:
        this.#endDrag();
        break;
      case 3:
        this.#endPinch();
        break;
    }
    this.#touchState = 0;
  };

  /** Legacy `TouchMove`. */
  #onTouchMove = (e: TouchEvent): void => {
    if (this.#tttimer !== null) {
      clearTimeout(this.#tttimer);
      this.#tttimer = null;
    }
    if (this.#touchState) {
      switch (this.#touchState) {
        case 1:
        case 2: {
          const p = canvasXY(e.changedTouches[0], this.canvas);
          this.mx = p.x;
          this.my = p.y;
          if (this.#drag(p)) {
            this.#touchState = 2;
          }
          break;
        }
        case 3:
          this.#pinch(e);
          break;
      }
      this.#drawn = false;
    }
  };

  /** Legacy `Wheel`. */
  #wheel(inc: boolean): void {
    this.setZoom(this.#zoomLevel + this.opts.zoomStep * (inc ? 1 : -1));
  }

  /** Legacy `BeginDrag`. */
  #beginDrag(coord: MouseEvent | Touch, e: Event): void {
    this.#down = canvasXY(coord, this.canvas);
    e.preventDefault();
  }

  /** Legacy `Drag`; returns whether a drag is in progress. */
  #drag(p: { x: number; y: number }): boolean {
    if (this.opts.dragControl && this.#down) {
      const t2 = this.opts.dragThreshold * this.opts.dragThreshold;
      const dx = p.x - this.#down.x;
      const dy = p.y - this.#down.y;
      if (this.#dragging || dx * dx + dy * dy > t2) {
        this.#dx = dx;
        this.#dy = dy;
        this.#dragging = true;
        this.#down = p;
      }
    }
    return this.#dragging;
  }

  /** Legacy `EndDrag`; returns whether a drag was in progress. */
  #endDrag(): boolean {
    const res = this.#dragging;
    this.#dragging = false;
    this.#down = null;
    return res;
  }

  /** Distance between two active touches (legacy `PinchDistance`). */
  #pinchDistance(e: TouchEvent): number {
    const t1 = e.targetTouches[0];
    const t2 = e.targetTouches[1];
    return Math.sqrt((t2.pageX - t1.pageX) ** 2 + (t2.pageY - t1.pageY) ** 2);
  }

  /** Legacy `BeginPinch`. */
  #beginPinch(e: TouchEvent): void {
    this.#pinched = [this.#pinchDistance(e), this.#zoomLevel];
    e.preventDefault();
  }

  /** Legacy `Pinch`. */
  #pinch(e: TouchEvent): void {
    const p = this.#pinched;
    if (!p) {
      return;
    }
    const d = this.#pinchDistance(e);
    this.setZoom((p[1] * d) / p[0]);
  }

  /** Legacy `EndPinch`. */
  #endPinch(): void {
    this.#pinched = null;
  }

  /** Legacy `Clicked`: audio-icon toggle, else follow the active tag's link. */
  #clicked(): void {
    if (this.#checkAudioIcon()) {
      this.toggleAudio();
      return;
    }
    const tag = this.#activeTag;
    try {
      if (this.#active && tag) {
        if (this.opts.clickToFront === false) {
          tag.clicked();
        } else {
          this.#rotateTagAnim(tag, 0, 0, this.opts.clickToFront, () => tag.clicked(), true);
        }
      }
    } catch {
      // swallow, matching the original's empty catch
    }
  }

  // --- Tooltip ---

  /** Dispatches to the configured tooltip strategy (legacy `Tooltip` binding). */
  #tooltip(active: Outline | null, tag: Tag | undefined): void {
    if (this.#tooltipMode === 'native') {
      if (active) {
        this.canvas.title = tag && tag.title ? tag.title : '';
      } else {
        this.canvas.title = this.#ctitle;
      }
    } else if (this.#tooltipMode === 'div' && this.#ttdiv) {
      if (active && tag && tag.title) {
        this.#setTTDiv(tag.title, tag);
      } else if (!active && this.mx !== -1 && this.my !== -1 && this.#ctitle.length) {
        this.#setTTDiv(this.#ctitle, null);
      } else {
        this.#ttdiv.style.display = 'none';
      }
    }
  }

  /** Positions and shows the `'div'` tooltip after `tooltipDelay` (legacy `SetTTDiv`). */
  #setTTDiv(title: string, tag: Tag | null): void {
    const div = this.#ttdiv;
    if (!div) {
      return;
    }
    const s = div.style;
    // Tooltip text comes from anchor `title` attributes, which are plain text
    // (native tooltips never render markup), so it is assigned as text rather
    // than as HTML.
    if (title !== div.textContent) {
      s.display = 'none';
    }
    div.textContent = title;
    if (tag) {
      tag.title = title;
    }
    if (s.display === 'none' && this.#tttimer === null) {
      this.#tttimer = setTimeout(() => {
        const p = absPos(this.canvas);
        s.display = 'block';
        s.left = p.x + this.mx + 'px';
        s.top = p.y + this.my + 24 + 'px';
        this.#tttimer = null;
      }, this.opts.tooltipDelay);
    }
  }

  // --- Audio ---

  /** Whether the pointer is over the audio icon hit-box (legacy `CheckAudioIcon`). */
  #checkAudioIcon(): boolean {
    const s = this.opts.audioIconSize;
    const t = this.opts.audioIconThickness / 2;
    const x = this.canvas.width - s - 3 - t;
    const y = this.canvas.height - s - 3 - t;
    return this.opts.audioIcon && this.mx >= x && this.my >= y;
  }

  /** Draws the audio (mute) icon in the bottom-right corner (legacy `ShowAudioIcon`). */
  #showAudioIcon(): void {
    if (!(this.opts.audioIcon && this.#hasAudio)) {
      return;
    }
    const ac = getAudioContext();
    if (!ac) {
      return;
    }
    const s = this.opts.audioIconSize;
    const cv = this.canvas;
    const x = cv.width - s - 3;
    const y = cv.height - s - 3;
    const muted = this.audioOff || ac.state === 'suspended';
    drawAudioIcon(this.ctxt, x, y, s, this.opts.audioIconThickness, this.opts.audioIconDark, muted);
  }

  /** Sets up the cloud-level `activeAudio` track (legacy `LoadAudio`). */
  #loadAudio(): void {
    const ac = getAudioContext();
    if (!ac) {
      return;
    }
    const src = this.opts.activeAudio;
    if (!src) {
      return;
    }
    const el = document.createElement('audio');
    el.src = src;
    this.activeAudioTrack = createTrack(el);
    this.#hasAudio = true;
    // Resume the (suspended) AudioContext on the first user interaction.
    document.addEventListener('click', () => ac.resume(), { once: true, signal: this.signal });
  }

  /** Loads the center image and installs a centerFunc that draws it (legacy `CentreImage`). */
  #loadCenterImage(url: string): void {
    const img = new Image();
    img.onload = (): void => {
      if (this.#destroyed) {
        return;
      }
      const dx = img.width / 2;
      const dy = img.height / 2;
      this.#centerFunc = (c, _w, _h, cx, cy): void => {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1;
        c.drawImage(img, cx - dx, cy - dy);
      };
    };
    img.src = url;
  }
}
