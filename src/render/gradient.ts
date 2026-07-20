import { createCanvas, get2dContext } from '@/render/canvas.js';
import type { WeightGradient } from '@/types.js';

/** Horizontal resolution of the rasterized gradient (columns = sample positions). */
const GRADIENT_WIDTH = 1024;

/**
 * Rasterizes one or more weight gradients into a cached canvas and answers
 * point color lookups against it.
 */
export class GradientCache {
  private readonly gradients: WeightGradient[];
  private readonly rows: number;
  private context: CanvasRenderingContext2D | null = null;

  /**
   * @param gradient - a single weight gradient, or one gradient per weight
   *   dimension (rendered as separate rows and selected via `row` in
   *   {@link colorAt})
   */
  constructor(gradient: WeightGradient | WeightGradient[]) {
    this.gradients = Array.isArray(gradient) ? gradient : [gradient];
    this.rows = this.gradients.length;
  }

  /**
   * Samples the gradient color at a normalized position.
   *
   * Ported from `FindGradientColour` (tagcanvas.js).
   *
   * @param position - normalized weight in the `0..1` range (left edge = `0`)
   * @param row - which gradient row to sample when multiple were supplied;
   *   clamped into range, defaults to `0`
   * @returns the sampled color as an `rgba(...)` string
   */
  colorAt(position: number, row = 0): string {
    const context = this.ensureContext();
    const r = Math.max(Math.min(row || 0, this.rows - 1), 0);
    // `| 0` mirrors the original's `~~` truncation (and maps NaN positions to 0).
    const data = context.getImageData(((GRADIENT_WIDTH - 1) * position) | 0, r, 1, 1).data;
    return `rgba(${data[0]},${data[1]},${data[2]},${data[3] / 255})`;
  }

  /** Builds (once) and returns the context of the rasterized gradient canvas. */
  private ensureContext(): CanvasRenderingContext2D {
    if (this.context) {
      return this.context;
    }
    const canvas = createCanvas(GRADIENT_WIDTH, this.rows);
    const context = get2dContext(canvas);
    for (let i = 0; i < this.rows; ++i) {
      GradientCache.paintRow(context, GRADIENT_WIDTH, i, this.gradients[i]);
    }
    this.context = context;
    return context;
  }

  /**
   * Paints a single 1px-tall gradient row.
   *
   * Ported from `SetGradient` (tagcanvas.js). Gradient stops are keyed
   * by weight, and each stop is placed at `1 - weight` so heavier weights map to
   * the left edge of the ramp, matching the original.
   */
  private static paintRow(
    context: CanvasRenderingContext2D,
    length: number,
    offset: number,
    gradient: WeightGradient,
  ): void {
    const ramp = context.createLinearGradient(0, 0, length, 0);
    for (const key of Object.keys(gradient)) {
      const stop = Number(key);
      ramp.addColorStop(1 - stop, gradient[stop]);
    }
    context.fillStyle = ramp;
    context.fillRect(0, offset, length, 1);
  }
}
