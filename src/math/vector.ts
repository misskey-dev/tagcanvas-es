/**
 * 3D vector with basic linear-algebra operations.
 */
export class Vector {
	x: number;
	y: number;
	z: number;

	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	/** Euclidean length of the vector. */
	length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	/** Dot product with `v`. */
	dot(v: Vector): number {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	}

	/** Cross product with `v`. */
	cross(v: Vector): Vector {
		const x = this.y * v.z - this.z * v.y;
		const y = this.z * v.x - this.x * v.z;
		const z = this.x * v.y - this.y * v.x;
		return new Vector(x, y, z);
	}

	/**
   * Angle to `v`, in radians.
   *
   * Mirrors the original's exact edge-case handling: a zero dot product short-circuits
   * to PI/2 (skipping the division), and the cosine ratio is clamped to [-1, 1] via
   * explicit branches (returning 0 / PI) rather than being passed straight into `acos`.
   */
	angle(v: Vector): number {
		const dot = this.dot(v);
		if (dot === 0) {
			return Math.PI / 2.0;
		}
		const ac = dot / (this.length() * v.length());
		if (ac >= 1) {
			return 0;
		}
		if (ac <= -1) {
			return Math.PI;
		}
		return Math.acos(ac);
	}

	/** Unit-length copy of this vector. */
	unit(): Vector {
		const l = this.length();
		return new Vector(this.x / l, this.y / l, this.z / l);
	}
}

/**
 * Builds a unit vector pointing at the given longitude/latitude, in degrees.
 * Ported from the original `MakeVector`.
 */
export function makeVector(lng: number, lat: number): Vector {
	const lt = (lat * Math.PI) / 180;
	const lg = (lng * Math.PI) / 180;
	const x = Math.sin(lg) * Math.cos(lt);
	const y = -Math.sin(lt);
	const z = -Math.cos(lg) * Math.cos(lt);
	return new Vector(x, y, z);
}
