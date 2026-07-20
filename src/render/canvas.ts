import type { TextAlign } from '@/types.js';

/** A canvas-drawable image source: either a loaded `<img>` or another canvas. */
export type CanvasImage = HTMLImageElement | HTMLCanvasElement;

/**
 * Creates a detached offscreen canvas of the given pixel size.
 *
 * Ported from `NewCanvas` (tagcanvas.js) with the excanvas/VML
 * fallback dropped — the result is always a usable `HTMLCanvasElement`.
 *
 * @param width - canvas width in device-independent pixels
 * @param height - canvas height in device-independent pixels
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Acquires a 2D rendering context, centralizing the `getContext('2d')!`
 * assertion the original code repeated at every call site.
 *
 * @param canvas - the canvas to draw on
 * @returns the canvas's 2D context
 * @throws if the browser cannot provide a 2D context for the canvas
 */
export function get2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('Could not acquire a 2D rendering context from the canvas.');
  }
  return context;
}

/**
 * Draws a rectangle whose corners are optionally rounded, filling it or
 * stroking its outline.
 *
 * Ported verbatim from `RRect` (tagcanvas.js). A falsy `radius`
 * takes the sharp-cornered fast path via `fillRect`/`strokeRect`.
 *
 * @param context - target 2D context
 * @param x - left edge
 * @param y - top edge
 * @param width - rectangle width
 * @param height - rectangle height
 * @param radius - corner radius; `0` (or any falsy value) draws square corners
 * @param stroke - when true, stroke the outline; otherwise fill the shape
 */
export function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke?: boolean,
): void {
  if (radius) {
    context.beginPath();
    context.moveTo(x, y + height - radius);
    context.arcTo(x, y, x + radius, y, radius);
    context.arcTo(x + width, y, x + width, y + radius, radius);
    context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    context.arcTo(x, y + height, x, y + height - radius, radius);
    context.closePath();
    if (stroke) {
      context.stroke();
    } else {
      context.fill();
    }
  } else if (stroke) {
    context.strokeRect(x, y, width, height);
  } else {
    context.fillRect(x, y, width, height);
  }
}

/**
 * Renders an array of strings as stacked lines of text, one per line, with
 * optional per-line horizontal alignment and drop shadow.
 *
 * Ported from `TextSet` (tagcanvas.js L315-340). The original alignment value
 * `'centre'` becomes `'center'`. Shadow parameters are honored only when
 * `shadowOffsets` is non-empty (matching the original's `shadowOffsets.length`
 * guards); passing `[]` disables shadow offset handling entirely.
 *
 * `maxWidth`, `widths` and `align` control per-line alignment and are only
 * consulted together — when `widths` is omitted, every line is drawn at the
 * left edge regardless of `align`.
 *
 * @param context - target 2D context
 * @param font - CSS font shorthand (e.g. `"40px 'Arial'"`); its leading pixel
 *   size also determines line spacing
 * @param color - fill color for the text
 * @param strings - the lines to draw, top to bottom
 * @param padX - left padding, before shadow adjustment
 * @param padY - top padding, before shadow adjustment
 * @param shadowColor - shadow color, or `null` to leave the context's shadow color unchanged
 * @param shadowBlur - shadow blur radius (also widens the left/top offset)
 * @param shadowOffsets - `[]` for no shadow offset, or `[offsetX, offsetY]`
 * @param maxWidth - width the lines are aligned within (used only with `widths`)
 * @param widths - measured width of each line, enabling alignment
 * @param align - horizontal alignment when `widths` is supplied
 */
export function textSet(
  context: CanvasRenderingContext2D,
  font: string,
  color: string,
  strings: string[],
  padX: number,
  padY: number,
  shadowColor: string | null,
  shadowBlur: number,
  shadowOffsets: number[],
  maxWidth?: number,
  widths?: number[],
  align?: TextAlign,
): void {
  const xo = padX + (shadowBlur || 0) +
    (shadowOffsets.length > 0 && shadowOffsets[0] < 0 ? Math.abs(shadowOffsets[0]) : 0);
  let yo = padY + (shadowBlur || 0) +
    (shadowOffsets.length > 0 && shadowOffsets[1] < 0 ? Math.abs(shadowOffsets[1]) : 0);
  context.font = font;
  context.textBaseline = 'top';
  context.fillStyle = color;
  if (shadowColor) {
    context.shadowColor = shadowColor;
  }
  if (shadowBlur) {
    context.shadowBlur = shadowBlur;
  }
  if (shadowOffsets.length > 0) {
    context.shadowOffsetX = shadowOffsets[0];
    context.shadowOffsetY = shadowOffsets[1];
  }
  const lineHeight = parseInt(font, 10);
  for (let i = 0; i < strings.length; ++i) {
    let xc = 0;
    if (widths) {
      if (align === 'right') {
        xc = (maxWidth ?? 0) - widths[i];
      } else if (align === 'center') {
        xc = ((maxWidth ?? 0) - widths[i]) / 2;
      }
    }
    context.fillText(strings[i], xo + xc, yo);
    yo += lineHeight;
  }
}
