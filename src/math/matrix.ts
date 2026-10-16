import { Vector } from '@/math/vector.js';

/**
 * 3x3 transformation matrix used for the cloud's rotation.
 */
export class Matrix {
	/** Row-major flat storage: `m[row * 3 + col]`, row/col both 0..2. */
	private readonly m: readonly number[];

	/**
   * @param a - 9 components in row-major order
   *   (`[m00, m01, m02, m10, m11, m12, m20, m21, m22]`), matching the original's
   *   `a[0]`..`a[8]` argument to `Matrix(a)`.
   */
	constructor(a: readonly number[]) {
		this.m = [
			a[0], a[1], a[2],
			a[3], a[4], a[5],
			a[6], a[7], a[8],
		];
	}

	private at(row: number, col: number): number {
		return this.m[row * 3 + col];
	}

	/** The 3x3 identity matrix. */
	static identity(): Matrix {
		return new Matrix([
			1, 0, 0,
			0, 1, 0,
			0, 0, 1,
		]);
	}

	/** Builds the matrix rotating by `angle` radians around unit axis `axis`. */
	static rotation(angle: number, axis: Vector): Matrix {
		const sina = Math.sin(angle);
		const cosa = Math.cos(angle);
		const mcos = 1 - cosa;
		const { x, y, z } = axis;
		return new Matrix([
			cosa + Math.pow(x, 2) * mcos, x * y * mcos - z * sina, x * z * mcos + y * sina,
			y * x * mcos + z * sina, cosa + Math.pow(y, 2) * mcos, y * z * mcos - x * sina,
			z * x * mcos - y * sina, z * y * mcos + x * sina, cosa + Math.pow(z, 2) * mcos,
		]);
	}

	/** Matrix product `this * m`. */
	mul(m: Matrix): Matrix {
		const a: number[] = [];
		for (let i = 0; i < 3; ++i) {
			for (let j = 0; j < 3; ++j) {
				a.push(
					this.at(i, 0) * m.at(0, j) +
          this.at(i, 1) * m.at(1, j) +
          this.at(i, 2) * m.at(2, j),
				);
			}
		}
		return new Matrix(a);
	}

	/** Transforms point `p` by this matrix. */
	xform(p: Vector): Vector {
		const { x, y, z } = p;
		return new Vector(
			x * this.at(0, 0) + y * this.at(1, 0) + z * this.at(2, 0),
			x * this.at(0, 1) + y * this.at(1, 1) + z * this.at(2, 1),
			x * this.at(0, 2) + y * this.at(1, 2) + z * this.at(2, 2),
		);
	}
}
