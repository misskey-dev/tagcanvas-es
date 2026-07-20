import type { Vector } from '@/math/vector.js';

/**
 * Clamps `value` to the `[min, max]` range.
 *
 * Ported from the original `Clamp`. Preserves the original's NaN handling: a NaN
 * `value` resolves to `max`, not to `min` or to `value` itself.
 */
export function clamp(value: number, min: number, max: number): number {
  return isNaN(value) ? max : Math.min(max, Math.max(min, value));
}

/**
 * Shuffles array `a` in place (Fisher-Yates, last-to-first).
 *
 * Ported from the original `Shuffle`, with its off-by-one corrected: the original
 * drew from `[0, i)`, excluding the current index and so never letting an element
 * stay put, which biases the resulting permutation. The draw is inclusive of `i`
 * here, making every permutation equally likely.
 */
export function shuffle<T>(a: T[]): void {
  let i = a.length - 1;
  while (i) {
    const p = Math.trunc(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[p];
    a[p] = t;
    --i;
  }
}

/** Result of projecting a 3D point onto the 2D canvas plane. */
export interface ProjectedPoint {
  /** Projected X coordinate, relative to the cloud's center. */
  x: number;
  /** Projected Y coordinate, relative to the cloud's center. */
  y: number;
  /** Original (unprojected) Z coordinate, i.e. depth in camera space. */
  z: number;
  /** Perspective scale factor for content drawn at this point (e.g. a tag's image/text). */
  w: number;
}

/**
 * Projects a 3D point (already transformed by the cloud's current rotation `Matrix`)
 * onto the 2D canvas plane using a simple perspective projection.
 *
 * Ported from the original `Project(tc, p1, sx, sy)`. The original read
 * `tc.radius`, `tc.z1` and `tc.z2` off the `TagCanvas` instance; this function takes the
 * same values as explicit parameters instead:
 *
 * | original field | parameter  | meaning |
 * |---|---|---|
 * | `tc.radius` | `radius` | `min(canvas.height, canvas.width) * 0.0075`, computed once from the canvas size so a shape of radius 100 fits it |
 * | `tc.z1` | `z1` | `250 / max(depth, 0.001)`, derived once from the `depth` option |
 * | `tc.z2` | `z2` | `z1 / zoom`, re-derived as `z1 * (1 / zoomLevel)` whenever the zoom level changes |
 * | `p1` | `p` | the point after being transformed by the current rotation `Matrix` |
 * | `sx` | `stretchX` | the `stretchX` option |
 * | `sy` | `stretchY` | the `stretchY` option |
 */
export function project(
  p: Vector,
  radius: number,
  z1: number,
  z2: number,
  stretchX: number,
  stretchY: number,
): ProjectedPoint {
  const m = (radius * z1) / (z1 + z2 + p.z);
  return {
    x: p.x * m * stretchX,
    y: p.y * m * stretchY,
    z: p.z,
    w: (z1 - p.z) / z2,
  };
}
