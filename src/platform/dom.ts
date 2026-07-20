/**
 * Reads a CSS property's computed value for an element.
 *
 * Ported from the original `GetProperty`, with the legacy
 * `currentStyle` (IE) fallback removed — `getComputedStyle` is always used.
 *
 * @param el - element to read the style of
 * @param prop - CSS property name, in kebab-case (e.g. `'font-size'`)
 * @returns the computed value, or `''` if the property is not set
 */
export function getStyleProperty(el: Element, prop: string): string {
  return getComputedStyle(el).getPropertyValue(prop);
}

/**
 * Determines a tag's weight, ported from the original `FindWeight`.
 *
 * When `attr` is given, the weight is the numeric value of that attribute on
 * `el`, falling back to `textHeight` if the attribute is missing or empty.
 * Otherwise the weight is derived from the element's computed `font-size`:
 * `px` values are used directly, `pt` values are scaled by 1.25, and any
 * other unit falls back to the raw numeric conversion scaled by 3.3 — this
 * matches the original's behavior (including its edge cases) verbatim.
 *
 * @param el - tag element to inspect
 * @param attr - attribute name to read the weight from, or `null` to derive it from `font-size`
 * @param textHeight - fallback weight used when `attr` is set but empty/missing
 * @returns the tag's numeric weight (may be `NaN` if the underlying value can't be parsed, matching the original)
 */
export function findWeight(el: HTMLElement, attr: string | null, textHeight: number): number {
  let w = 1;
  if (attr) {
    const raw = el.getAttribute(attr);
    w = Number(raw || textHeight);
  } else {
    const p = getStyleProperty(el, 'font-size');
    if (p) {
      w = (p.includes('px') && Number(p.replace('px', ''))) ||
        (p.includes('pt') && Number(p.replace('pt', '')) * 1.25) ||
        Number(p) * 3.3;
    }
  }
  return w;
}

/**
 * Computes an element's document-absolute position, ported from the original
 * `AbsPos`. Unlike the original, this takes the element
 * directly rather than looking it up by id.
 *
 * @param el - element to locate
 * @returns the element's top-left corner, in document coordinates
 */
export function absPos(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  const dd = document.documentElement;
  const b = document.body;
  const xs = window.pageXOffset || dd.scrollLeft;
  const ys = window.pageYOffset || dd.scrollTop;
  const xo = dd.clientLeft || b.clientLeft;
  const yo = dd.clientTop || b.clientTop;
  return { x: r.left + xs - xo, y: r.top + ys - yo };
}

/**
 * Converts a mouse/touch event's viewport coordinates into canvas-internal
 * pixel coordinates, accounting for any CSS scaling of the canvas element.
 *
 * This replaces the original `EventXY`: rather than
 * branching on `offsetX` support vs. computing an offset from `AbsPos`, it
 * always derives the position from `getBoundingClientRect`, then scales it
 * by the ratio of the canvas's internal pixel size to its rendered CSS size.
 *
 * @param e - the mouse event, or a single touch from a touch event
 * @param canvas - the canvas the coordinates should be relative to
 * @returns the position in the canvas's internal pixel space
 */
export function canvasXY(e: MouseEvent | Touch, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

/**
 * Whether an image finished loading but failed, leaving it unusable.
 *
 * A broken image reports `complete` just like a successful one, but has no
 * intrinsic size. Passing it to `drawImage` throws `InvalidStateError`, so it
 * has to be filtered out before the tag adopts it.
 */
export function isImageBroken(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth === 0;
}

/** Parses a computed CSS size into pixels, or `null` if it is not a definite length. */
function cssLength(value: string): number | null {
  if (!value.endsWith('px')) {
    // `auto`, a percentage, or an empty string: not a resolvable length here.
    return null;
  }
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Resolves the display size a source `<img>` is meant to have, in CSS pixels.
 *
 * `HTMLImageElement.width`/`height` only report the rendered size while the
 * element is actually being laid out; for a `display: none` element (a tag list
 * hidden by `hideTags`, or one the page hides itself) they fall back to the
 * image's intrinsic size, silently discarding any CSS sizing. Reading the
 * computed style instead keeps `style="width: 32px"` and stylesheet rules
 * working in both states.
 *
 * When only one dimension is specified, the other is derived from the intrinsic
 * aspect ratio — the same result layout would produce from `height: auto`.
 *
 * @param img - the source image element from the tag markup
 * @returns the intended width/height in CSS pixels
 */
export function resolveImageSize(img: HTMLImageElement): { width: number; height: number } {
  if (img.getClientRects().length > 0) {
    // Being rendered, so layout has already applied the CSS (including the
    // aspect-ratio fill-in) and the IDL properties are authoritative.
    return { width: img.width, height: img.height };
  }

  const style = getComputedStyle(img);
  const w = cssLength(style.width);
  const h = cssLength(style.height);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  if (w !== null && h !== null) {
    return { width: w, height: h };
  }
  if (w !== null) {
    return { width: w, height: nw > 0 ? (w * nh) / nw : w };
  }
  if (h !== null) {
    return { width: nh > 0 ? (h * nw) / nh : h, height: h };
  }
  // No CSS sizing at all: fall back to the width/height attributes, or the
  // intrinsic size when those are absent too.
  return { width: img.width, height: img.height };
}
