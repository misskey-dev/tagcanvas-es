import type { XYZ } from '@/tagcanvas/types';

export class Vector {
	constructor(
		public x: number,
		public y: number,
		public z: number,
	) {}

	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}

	dot(v: Vector) {
		return this.x * v.x + this.y * v.y + this.z * v.z;
	}

	cross(v: Vector) {
		const x = this.y * v.z - this.z * v.y;
		const y = this.z * v.x - this.x * v.z;
		const z = this.x * v.y - this.y * v.x;
		return new Vector(x, y, z);
	}

	angle(v: Vector) {
		const dotv = this.dot(v);
		if (dotv === 0) return Math.PI / 2;
		const ac = dotv / (this.length() * v.length());
		if (ac >= 1) return 0;
		if (ac <= -1) return Math.PI;
		return Math.acos(ac);
	}

	unit() {
		const l = this.length();
		return new Vector(this.x / l, this.y / l, this.z / l);
	}
}

export function MakeVector(lg: number, lt: number) {
	lt = (lt * Math.PI) / 180;
	lg = (lg * Math.PI) / 180;
	const x = Math.sin(lg) * Math.cos(lt);
	const y = -Math.sin(lt);
	const z = -Math.cos(lg) * Math.cos(lt);
	return new Vector(x, y, z);
}

export class Matrix {
	// row-major 3x3
	private m: [[number, number, number], [number, number, number], [number, number, number]];

	constructor(a: number[]) {
		this.m = [
			[a[0], a[1], a[2]],
			[a[3], a[4], a[5]],
			[a[6], a[7], a[8]],
		];
	}

	static Identity() {
		return new Matrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
	}

	static Rotation(angle: number, u: Vector) {
		const sina = Math.sin(angle);
		const cosa = Math.cos(angle);
		const mcos = 1 - cosa;
		return new Matrix([
			cosa + Math.pow(u.x, 2) * mcos,
			u.x * u.y * mcos - u.z * sina,
			u.x * u.z * mcos + u.y * sina,
			u.y * u.x * mcos + u.z * sina,
			cosa + Math.pow(u.y, 2) * mcos,
			u.y * u.z * mcos - u.x * sina,
			u.z * u.x * mcos - u.y * sina,
			u.z * u.y * mcos + u.x * sina,
			cosa + Math.pow(u.z, 2) * mcos,
		]);
	}

	mul(m: Matrix | number) {
		const a: number[] = [];
		if (typeof m === 'number') {
			for (let i = 0; i < 3; ++i) {
				for (let j = 0; j < 3; ++j) {
					a.push(this.m[i][j] * m);
				}
			}
			return new Matrix(a);
		}
		for (let i = 0; i < 3; ++i) {
			for (let j = 0; j < 3; ++j) {
				a.push(
					this.m[i][0] * m.m[0][j] +
						this.m[i][1] * m.m[1][j] +
						this.m[i][2] * m.m[2][j],
				);
			}
		}
		return new Matrix(a);
	}

	xform(p: Vector): XYZ {
		const x = p.x,
			y = p.y,
			z = p.z;
		return {
			x: x * this.m[0][0] + y * this.m[1][0] + z * this.m[2][0],
			y: x * this.m[0][1] + y * this.m[1][1] + z * this.m[2][1],
			z: x * this.m[0][2] + y * this.m[1][2] + z * this.m[2][2],
		};
	}
}

export function Project(tc: any, p1: any, sx: number, sy: number) {
	const m = (tc.radius * tc.z1) / (tc.z1 + tc.z2 + p1.z);
	return {
		x: p1.x * m * sx,
		y: p1.y * m * sy,
		z: p1.z,
		w: (tc.z1 - p1.z) / tc.z2,
	};
}
