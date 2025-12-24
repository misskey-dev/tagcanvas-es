import type { ThreeDCoord } from '@/tagcanvas/types';

export function PointsOnSphere(n: number, xr: number, yr: number, zr: number, magic?: any): ThreeDCoord[] {
	const pts: ThreeDCoord[] = [];
	const off = 2 / n;
	const inc = Math.PI * (3 - Math.sqrt(5) + (parseFloat(magic) ? parseFloat(magic) : 0));
	for (let i = 0; i < n; ++i) {
		const y = i * off - 1 + off / 2;
		const r = Math.sqrt(1 - y * y);
		const phi = i * inc;
		pts.push([Math.cos(phi) * r * xr, y * yr, Math.sin(phi) * r * zr]);
	}
	return pts;
}

function Cylinder(n: number, o: number, xr: number, yr: number, zr: number, magic?: any): ThreeDCoord[] {
	const pts: ThreeDCoord[] = [];
	const off = 2 / n;
	const inc = Math.PI * (3 - Math.sqrt(5) + (parseFloat(magic) ? parseFloat(magic) : 0));
	for (let i = 0; i < n; ++i) {
		const j = i * off - 1 + off / 2;
		const phi = i * inc;
		const k = Math.cos(phi);
		const l = Math.sin(phi);
		pts.push(o ? [j * xr, k * yr, l * zr] : [k * xr, j * yr, l * zr]);
	}
	return pts;
}

function Ring(o: number, n: number, xr: number, yr: number, zr: number, j: number): ThreeDCoord[] {
	const pts: ThreeDCoord[] = [];
	const inc = (Math.PI * 2) / n;
	for (let i = 0; i < n; ++i) {
		const phi = i * inc;
		const k = Math.cos(phi);
		const l = Math.sin(phi);
		pts.push(o ? [j * xr, k * yr, l * zr] : [k * xr, j * yr, l * zr]);
	}
	return pts;
}

export function PointsOnCylinderV(n: number, xr: number, yr: number, zr: number, m?: any) {
	return Cylinder(n, 0, xr, yr, zr, m);
}

export function PointsOnCylinderH(n: number, xr: number, yr: number, zr: number, m?: any) {
	return Cylinder(n, 1, xr, yr, zr, m);
}

export function PointsOnRingV(n: number, xr: number, yr: number, zr: number, offset?: any) {
	offset = Number.isNaN(offset) ? 0 : offset * 1;
	return Ring(0, n, xr, yr, zr, offset);
}

export function PointsOnRingH(n: number, xr: number, yr: number, zr: number, offset?: any) {
	offset = Number.isNaN(offset) ? 0 : offset * 1;
	return Ring(1, n, xr, yr, zr, offset);
}
