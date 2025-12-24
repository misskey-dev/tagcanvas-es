export function Defined<T>(d: T): d is Exclude<T, undefined> {
	return typeof d !== 'undefined';
}

export function IsObject(o: unknown): o is Record<string, any> {
	return typeof o === 'object' && o !== null;
}

export function Clamp(v: number, mn: number, mx: number) {
	return Number.isNaN(v) ? mx : Math.min(mx, Math.max(mn, v));
}

export function Nop() {
	return false;
}

export function TimeNow() {
	return Date.now();
}

export function SortList<T>(l: T[], f: (a: T, b: T) => number) {
	const nl = l.slice();
	nl.sort(f);
	return nl;
}

export function Shuffle<T>(a: T[]) {
	let i = a.length - 1;
	while (i) {
		const p = ~~(Math.random() * i);
		const t = a[i];
		a[i] = a[p];
		a[p] = t;
		--i;
	}
}
