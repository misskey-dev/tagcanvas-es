import type { ShapePointGenerator, TagShape } from '@/types.js';

/**
 * Resolves the optional `magic` shape argument shared by {@link pointsOnSphere} and
 * {@link cylinder}: a small perturbation added to the golden-angle increment used to
 * space points around the sphere/cylinder's circumference.
 *
 * Ported from the original's `parseFloat(magic) ? parseFloat(magic) : 0`.
 * `magic` here already arrives as `number | undefined` rather than a string to parse, so
 * a plain falsy check reproduces the original exactly: `undefined`, `0` and `NaN` (itself
 * falsy) all fall back to `0`.
 */
function resolveMagic(magic: number | undefined): number {
  return magic ? magic : 0;
}

/**
 * Resolves the optional `offset` shape argument used by {@link ring}: the constant
 * coordinate (scaled by the relevant radius) shared by every point on the ring.
 *
 * Ported from the original's `offset = isNaN(offset) ? 0 : offset * 1`.
 */
function resolveOffset(offset: number | undefined): number {
  return offset === undefined || Number.isNaN(offset) ? 0 : offset;
}

/**
 * Distributes `count` points evenly over a sphere using the golden-angle (Fibonacci
 * sphere) method.
 *
 * Ported from the original `PointsOnSphere`. `args[0]` is the original's
 * optional `magic` parameter (see {@link resolveMagic}).
 */
function pointsOnSphere(
  count: number, radiusX: number, radiusY: number, radiusZ: number, ...args: number[]
): [number, number, number][] {
  const off = 2 / count;
  const inc = Math.PI * (3 - Math.sqrt(5) + resolveMagic(args[0]));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < count; ++i) {
    const y = i * off - 1 + off / 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * inc;
    pts.push([Math.cos(phi) * r * radiusX, y * radiusY, Math.sin(phi) * r * radiusZ]);
  }
  return pts;
}

/**
 * Shared point generator backing the vertical and horizontal cylinder shapes.
 *
 * Ported from the original `Cylinder`. `horizontal` corresponds to the
 * original's `o` flag: `false` (0) lays the cylinder's axis along Y (the "vertical"
 * cylinder, `PointsOnCylinderV`'s `o=0` call), `true` (1) lays it along X (the
 * "horizontal" cylinder, `PointsOnCylinderH`'s `o=1` call). `magic` is the original's
 * optional `magic` parameter (see {@link resolveMagic}).
 */
function cylinder(
  count: number, horizontal: boolean, radiusX: number, radiusY: number, radiusZ: number,
  magic: number | undefined,
): [number, number, number][] {
  const off = 2 / count;
  const inc = Math.PI * (3 - Math.sqrt(5) + resolveMagic(magic));
  const pts: [number, number, number][] = [];
  for (let i = 0; i < count; ++i) {
    const j = i * off - 1 + off / 2;
    const phi = i * inc;
    const k = Math.cos(phi);
    const l = Math.sin(phi);
    pts.push(horizontal ? [j * radiusX, k * radiusY, l * radiusZ] : [k * radiusX, j * radiusY, l * radiusZ]);
  }
  return pts;
}

/**
 * Shared point generator backing the vertical and horizontal ring shapes.
 *
 * Ported from the original `Ring`. `horizontal` corresponds to the original's
 * `o` flag (`false`/0 for `PointsOnRingV`, `true`/1 for `PointsOnRingH`), analogous to
 * {@link cylinder}'s flag. `offset` is the already-resolved (see {@link resolveOffset})
 * constant coordinate shared by every point on the ring.
 */
function ring(
  count: number, horizontal: boolean, radiusX: number, radiusY: number, radiusZ: number,
  offset: number,
): [number, number, number][] {
  const inc = (Math.PI * 2) / count;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < count; ++i) {
    const phi = i * inc;
    const k = Math.cos(phi);
    const l = Math.sin(phi);
    pts.push(
      horizontal
        ? [offset * radiusX, k * radiusY, l * radiusZ]
        : [k * radiusX, offset * radiusY, l * radiusZ],
    );
  }
  return pts;
}

/**
 * Vertical cylinder: axis along Y.
 * Ported from the original `PointsOnCylinderV`.
 */
function pointsOnCylinderV(
  count: number, radiusX: number, radiusY: number, radiusZ: number, ...args: number[]
): [number, number, number][] {
  return cylinder(count, false, radiusX, radiusY, radiusZ, args[0]);
}

/**
 * Horizontal cylinder: axis along X.
 * Ported from the original `PointsOnCylinderH`.
 */
function pointsOnCylinderH(
  count: number, radiusX: number, radiusY: number, radiusZ: number, ...args: number[]
): [number, number, number][] {
  return cylinder(count, true, radiusX, radiusY, radiusZ, args[0]);
}

/**
 * Vertical ring: lies in the X-Z plane, offset along Y.
 *
 * Ported from the original `PointsOnRingV`. `args[0]` is the original's
 * optional `offset` parameter (see {@link resolveOffset}).
 */
function pointsOnRingV(
  count: number, radiusX: number, radiusY: number, radiusZ: number, ...args: number[]
): [number, number, number][] {
  return ring(count, false, radiusX, radiusY, radiusZ, resolveOffset(args[0]));
}

/**
 * Horizontal ring: lies in the Y-Z plane, offset along X.
 *
 * Ported from the original `PointsOnRingH`. `args[0]` is the original's
 * optional `offset` parameter (see {@link resolveOffset}).
 */
function pointsOnRingH(
  count: number, radiusX: number, radiusY: number, radiusZ: number, ...args: number[]
): [number, number, number][] {
  return ring(count, true, radiusX, radiusY, radiusZ, resolveOffset(args[0]));
}

/**
 * Built-in point-cloud generators, keyed by {@link TagShape}.
 *
 * Ported from the original shape point generators and the `pfuncs` lookup. Point
 * generation is fully deterministic, so for a given `(count, radiusX, radiusY, radiusZ,
 * ...args)` the returned point order and coordinates match the original exactly.
 */
export const shapes: Record<TagShape, ShapePointGenerator> = {
  sphere: pointsOnSphere,
  vcylinder: pointsOnCylinderV,
  hcylinder: pointsOnCylinderH,
  vring: pointsOnRingV,
  hring: pointsOnRingH,
};
