/**
 * TagCanvas 2.11 (TypeScript port)
 *
 * Ported from the bundled `src/tagcanvas.js` implementation.
 * The project is distributed under LGPL-3.0-only (see repository LICENSE).
 */

export interface TagCanvasOptions {
	z1?: number;
	z2?: number;
	z0?: number;
	freezeActive?: boolean;
	freezeDecel?: boolean;
	activeCursor?: string;
	pulsateTo?: number;
	pulsateTime?: number;
	reverse?: boolean;
	depth?: number;
	maxSpeed?: number;
	minSpeed?: number;
	decel?: number;
	interval?: number;
	minBrightness?: number;
	maxBrightness?: number;
	outlineColour?: string;
	outlineThickness?: number;
	outlineOffset?: number;
	outlineMethod?: string;
	outlineRadius?: number;
	textColour?: string;
	textHeight?: number;
	textFont?: string;
	shadow?: string;
	shadowBlur?: number;
	shadowOffset?: [number, number];
	initial?: [number, number] | null;
	hideTags?: boolean;
	zoom?: number;
	weight?: boolean;
	weightMode?: string;
	weightFrom?: string | null;
	weightSize?: number;
	weightSizeMin?: number | null;
	weightSizeMax?: number | null;
	weightGradient?: any;
	txtOpt?: boolean;
	txtScale?: number;
	frontSelect?: boolean;
	wheelZoom?: boolean;
	zoomMin?: number;
	zoomMax?: number;
	zoomStep?: number;
	shape?: any;
	lock?: any;
	tooltip?: any;
	tooltipDelay?: number;
	tooltipClass?: string;
	radiusX?: number;
	radiusY?: number;
	radiusZ?: number;
	stretchX?: number;
	stretchY?: number;
	offsetX?: number;
	offsetY?: number;
	shuffleTags?: boolean;
	noSelect?: boolean;
	noMouse?: boolean;
	imageScale?: number;
	paused?: boolean;
	dragControl?: boolean;
	dragThreshold?: number;
	centreFunc?: (
		c: CanvasRenderingContext2D,
		w: number,
		h: number,
		cx: number,
		cy: number,
	) => void;
	splitWidth?: number;
	animTiming?: string | ((t: number, t0: number) => number);
	clickToFront?: any;
	fadeIn?: number;
	padding?: number;
	bgColour?: string | null;
	bgRadius?: number;
	bgOutline?: string | null;
	bgOutlineThickness?: number;
	outlineIncrease?: number;
	textAlign?: string;
	textVAlign?: string;
	imageMode?: string | null;
	imagePosition?: string | null;
	imagePadding?: number;
	imageAlign?: string;
	imageVAlign?: string;
	noTagsMessage?: boolean;
	centreImage?: string | null;
	pinchZoom?: boolean;
	repeatTags?: number;
	minTags?: number;
	imageRadius?: any;
	scrollPause?: any;
	outlineDash?: number;
	outlineDashSpace?: number;
	outlineDashSpeed?: number;
	activeAudio?: any;
	audioVolume?: number;
	audioIcon?: any;
	audioIconSize?: number;
	audioIconThickness?: number;
	audioIconDark?: any;
	altImage?: any;
}

type ThreeDCoord = [x: number, y: number, z: number];
type XY = { x: number; y: number };
type XYZ = { x: number; y: number; z: number };

const abs = Math.abs;
const sin = Math.sin;
const cos = Math.cos;
const max = Math.max;
const min = Math.min;
const ceil = Math.ceil;
const sqrt = Math.sqrt;
const pow = Math.pow;

const doc = document;

let ocanvas: HTMLCanvasElement | null | undefined;
let audio: AudioContext | 'off' | undefined;
let audioClick: ((e: Event) => void) | undefined;
const handlers: Record<string, any[]> = {};

const hexlookup1: Record<string, string> = {
	0: '0,',
	1: '17,',
	2: '34,',
	3: '51,',
	4: '68,',
	5: '85,',
	6: '102,',
	7: '119,',
	8: '136,',
	9: '153,',
	a: '170,',
	A: '170,',
	b: '187,',
	B: '187,',
	c: '204,',
	C: '204,',
	d: '221,',
	D: '221,',
	e: '238,',
	E: '238,',
	f: '255,',
	F: '255,',
};

const hexlookup2: Record<string, string> = (() => {
	const out: Record<string, string> = {};
	for (let i = 0; i < 256; ++i) {
		let j = i.toString(16);
		if (i < 16) j = '0' + j;
		out[j] = out[j.toUpperCase()] = i.toString() + ',';
	}
	return out;
})();

const hexlookup3: Record<string, string> = {};

function Defined<T>(d: T): d is Exclude<T, undefined> {
	return typeof d !== 'undefined';
}

function IsObject(o: unknown): o is Record<string, any> {
	return typeof o === 'object' && o !== null;
}

function Clamp(v: number, mn: number, mx: number) {
	return Number.isNaN(v) ? mx : min(mx, max(mn, v));
}

function Nop() {
	return false;
}

function TimeNow() {
	return Date.now();
}

function SortList<T>(l: T[], f: (a: T, b: T) => number) {
	const nl = l.slice();
	nl.sort(f);
	return nl;
}

function Shuffle<T>(a: T[]) {
	let i = a.length - 1;
	while (i) {
		const p = ~~(Math.random() * i);
		const t = a[i];
		a[i] = a[p];
		a[p] = t;
		--i;
	}
}

function SetupAudio(): AudioContext | undefined {
	// @ts-expect-error: webkitAudioContext exists on some browsers
	const ac = window.AudioContext || window.webkitAudioContext;
	try {
		if (!ac) {
			audio = 'off';
			return undefined;
		}
		audio = new ac();
		if (!audio) {
			audio = 'off';
			return undefined;
		}
		return audio;
	} catch {
		audio = 'off';
		return undefined;
	}
}

function AudioIcon(
	mute: any,
	c: CanvasRenderingContext2D,
	size: number,
	offsetx: number,
	offsety: number,
	stroke: number,
	colour: string,
) {
	const x = offsetx,
		y = offsety,
		s = size * 0.01,
		w = 80 * s,
		h = 100 * s,
		d = 40 * s,
		e = 30 * s;
	const f = e / 2;
	const x2 = x + w,
		x1 = x2 - d;
	const y3 = y + h,
		y2 = y3 - e,
		y1 = y + e,
		y4 = y + h / 2;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.setLineDash([]);
	c.globalAlpha = 1;
	c.strokeStyle = colour;
	c.lineWidth = stroke;
	c.lineJoin = 'round';
	c.beginPath();
	c.moveTo(x1, y1);
	c.lineTo(x1, y2);
	c.moveTo(x2, y3);
	c.lineTo(x1, y2);
	c.lineTo(x, y2);
	c.lineTo(x, y1);
	c.lineTo(x1, y1);
	c.lineTo(x2, y);
	if (mute) {
		c.lineTo(x2, y1);
		c.moveTo(x2, y2);
		c.lineTo(x2, y3);
		c.moveTo(x2 - f, y4 - f);
		c.lineTo(x2 + f, y4 + f);
		c.moveTo(x2 + f, y4 - f);
		c.lineTo(x2 - f, y4 + f);
		c.stroke();
		return;
	}
	c.closePath();
	c.stroke();
}

class Vector {
	constructor(
		public x: number,
		public y: number,
		public z: number,
	) {}

	length() {
		return sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
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

function MakeVector(lg: number, lt: number) {
	lt = (lt * Math.PI) / 180;
	lg = (lg * Math.PI) / 180;
	const x = sin(lg) * cos(lt);
	const y = -sin(lt);
	const z = -cos(lg) * cos(lt);
	return new Vector(x, y, z);
}

class Matrix {
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
		const sina = sin(angle);
		const cosa = cos(angle);
		const mcos = 1 - cosa;
		return new Matrix([
			cosa + pow(u.x, 2) * mcos,
			u.x * u.y * mcos - u.z * sina,
			u.x * u.z * mcos + u.y * sina,
			u.y * u.x * mcos + u.z * sina,
			cosa + pow(u.y, 2) * mcos,
			u.y * u.z * mcos - u.x * sina,
			u.z * u.x * mcos - u.y * sina,
			u.z * u.y * mcos + u.x * sina,
			cosa + pow(u.z, 2) * mcos,
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

function PointsOnSphere(n: number, xr: number, yr: number, zr: number, magic?: any): ThreeDCoord[] {
	const pts: ThreeDCoord[] = [];
	const off = 2 / n;
	const inc = Math.PI * (3 - sqrt(5) + (parseFloat(magic) ? parseFloat(magic) : 0));
	for (let i = 0; i < n; ++i) {
		const y = i * off - 1 + off / 2;
		const r = sqrt(1 - y * y);
		const phi = i * inc;
		pts.push([cos(phi) * r * xr, y * yr, sin(phi) * r * zr]);
	}
	return pts;
}

function Cylinder(n: number, o: number, xr: number, yr: number, zr: number, magic?: any): ThreeDCoord[] {
	const pts: ThreeDCoord[] = [];
	const off = 2 / n;
	const inc = Math.PI * (3 - sqrt(5) + (parseFloat(magic) ? parseFloat(magic) : 0));
	for (let i = 0; i < n; ++i) {
		const j = i * off - 1 + off / 2;
		const phi = i * inc;
		const k = cos(phi);
		const l = sin(phi);
		pts.push(o ? [j * xr, k * yr, l * zr] : [k * xr, j * yr, l * zr]);
	}
	return pts;
}

function Ring(o: number, n: number, xr: number, yr: number, zr: number, j: number): ThreeDCoord[] {
	const pts: ThreeDCoord[] = [];
	const inc = (Math.PI * 2) / n;
	for (let i = 0; i < n; ++i) {
		const phi = i * inc;
		const k = cos(phi);
		const l = sin(phi);
		pts.push(o ? [j * xr, k * yr, l * zr] : [k * xr, j * yr, l * zr]);
	}
	return pts;
}

function PointsOnCylinderV(n: number, xr: number, yr: number, zr: number, m?: any) {
	return Cylinder(n, 0, xr, yr, zr, m);
}
function PointsOnCylinderH(n: number, xr: number, yr: number, zr: number, m?: any) {
	return Cylinder(n, 1, xr, yr, zr, m);
}
function PointsOnRingV(n: number, xr: number, yr: number, zr: number, offset?: any) {
	offset = Number.isNaN(offset) ? 0 : offset * 1;
	return Ring(0, n, xr, yr, zr, offset);
}
function PointsOnRingH(n: number, xr: number, yr: number, zr: number, offset?: any) {
	offset = Number.isNaN(offset) ? 0 : offset * 1;
	return Ring(1, n, xr, yr, zr, offset);
}

function CentreImage(t: any) {
	const i = new Image();
	i.onload = function () {
		const dx = i.width / 2;
		const dy = i.height / 2;
		t.centreFunc = function (c: CanvasRenderingContext2D, _w: number, _h: number, cx: number, cy: number) {
			c.setTransform(1, 0, 0, 1, 0, 0);
			c.globalAlpha = 1;
			c.drawImage(i, cx - dx, cy - dy);
		};
	};
	i.src = t.centreImage;
}

function SetAlpha(c: string, a: number) {
	let d = c;
	let p1: number;
	let p2: number;
	const ae = (a * 1).toPrecision(3) + ')';
	if (c[0] === '#') {
		if (!hexlookup3[c]) {
			if (c.length === 4) {
				hexlookup3[c] =
					'rgba(' + hexlookup1[c[1]] + hexlookup1[c[2]] + hexlookup1[c[3]];
			} else {
				hexlookup3[c] =
					'rgba(' +
					hexlookup2[c.substr(1, 2)] +
					hexlookup2[c.substr(3, 2)] +
					hexlookup2[c.substr(5, 2)];
			}
		}
		d = hexlookup3[c] + ae;
	} else if (c.substr(0, 4) === 'rgb(' || c.substr(0, 4) === 'hsl(') {
		d = c.replace('(', 'a(').replace(')', ',' + ae);
	} else if (c.substr(0, 5) === 'rgba(' || c.substr(0, 5) === 'hsla(') {
		p1 = c.lastIndexOf(',') + 1;
		p2 = c.indexOf(')');
		a *= parseFloat(c.substring(p1, p2));
		d = c.substr(0, p1) + a.toPrecision(3) + ')';
	}
	return d;
}

function NewCanvas(w: number, h: number) {
	if ((window as any).G_vmlCanvasManager) return null;
	const c = doc.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
}

function ShadowAlphaBroken() {
	let cv = NewCanvas(3, 3);
	if (!cv) return false;
	const c = cv.getContext('2d')!;
	c.strokeStyle = '#000';
	c.shadowColor = '#fff';
	c.shadowBlur = 3;
	c.globalAlpha = 0;
	c.strokeRect(2, 2, 2, 2);
	c.globalAlpha = 1;
	const i = c.getImageData(2, 2, 1, 1);
	cv = null;
	return i.data[0] > 0;
}

function SetGradient(c: CanvasRenderingContext2D, l: number, o: number, g: any) {
	const gd = c.createLinearGradient(0, 0, l, 0);
	for (const i in g) gd.addColorStop(1 - (i as any), g[i]);
	c.fillStyle = gd;
	c.fillRect(0, o, l, 1);
}

function FindGradientColour(tc: any, p: number, r?: number) {
	const l = 1024;
	let h = 1;
	let gl = tc.weightGradient;
	let cv: HTMLCanvasElement | null;
	let c: CanvasRenderingContext2D;
	let d: Uint8ClampedArray;

	if (tc.gCanvas) {
		c = tc.gCanvas.getContext('2d');
		h = tc.gCanvas.height;
	} else {
		if (IsObject(gl[0])) h = gl.length;
		else gl = [gl];
		tc.gCanvas = cv = NewCanvas(l, h);
		if (!cv) return null;
		c = cv.getContext('2d')!;
		for (let i = 0; i < h; ++i) SetGradient(c, l, i, gl[i]);
	}
	r = max(min(r || 0, h - 1), 0);
	d = c.getImageData(~~((l - 1) * p), r, 1, 1).data;
	return 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + d[3] / 255 + ')';
}

function TextSet(
	ctxt: CanvasRenderingContext2D,
	font: string,
	colour: string,
	strings: string[],
	padx: number,
	pady: number,
	shadowColour: any,
	shadowBlur: number,
	shadowOffsets: number[],
	maxWidth: any,
	widths?: number[],
	align?: string,
) {
	const xo =
		padx +
		(shadowBlur || 0) +
		(shadowOffsets.length && shadowOffsets[0] < 0 ? abs(shadowOffsets[0]) : 0);
	let yo =
		pady +
		(shadowBlur || 0) +
		(shadowOffsets.length && shadowOffsets[1] < 0 ? abs(shadowOffsets[1]) : 0);
	ctxt.font = font;
	ctxt.textBaseline = 'top';
	ctxt.fillStyle = colour;
	shadowColour && (ctxt.shadowColor = shadowColour);
	shadowBlur && (ctxt.shadowBlur = shadowBlur);
	shadowOffsets.length && ((ctxt.shadowOffsetX = shadowOffsets[0]), (ctxt.shadowOffsetY = shadowOffsets[1]));
	for (let i = 0; i < strings.length; ++i) {
		let xc = 0;
		if (widths) {
			if ('right' === align) xc = maxWidth - widths[i];
			else if ('centre' === align) xc = (maxWidth - widths[i]) / 2;
		}
		ctxt.fillText(strings[i], xo + xc, yo);
		yo += parseInt(font);
	}
}

function RRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, s?: boolean) {
	if (r) {
		c.beginPath();
		c.moveTo(x, y + h - r);
		c.arcTo(x, y, x + r, y, r);
		c.arcTo(x + w, y, x + w, y + r, r);
		c.arcTo(x + w, y + h, x + w - r, y + h, r);
		c.arcTo(x, y + h, x, y + h - r, r);
		c.closePath();
		(c as any)[s ? 'stroke' : 'fill']();
	} else {
		(c as any)[s ? 'strokeRect' : 'fillRect'](x, y, w, h);
	}
}

class TextCanvas {
	image?: CanvasImageSource;
	iwidth?: number;
	iheight?: number;
	ipos?: any;
	ipad?: number;
	iscale?: number;
	ialign?: any;
	ivalign?: any;

	constructor(
		public strings: string[],
		public font: string,
		public width: number,
		public height: number,
		public maxWidth: number,
		public stringWidths: number[],
		public align: any,
		public valign: any,
		public scale: number,
	) {}

	SetImage(image: CanvasImageSource, w: number, h: number, position: any, padding: number, align: any, valign: any, scale: number) {
		this.image = image;
		this.iwidth = w * this.scale;
		this.iheight = h * this.scale;
		this.ipos = position;
		this.ipad = padding * this.scale;
		this.iscale = scale;
		this.ialign = align;
		this.ivalign = valign;
	}

	Align(size: number, space: number, a: any) {
		let pos = 0;
		if (a === 'right' || a === 'bottom') pos = space - size;
		else if (a !== 'left' && a !== 'top') pos = (space - size) / 2;
		return pos;
	}

	Create(
		colour: any,
		bgColour: any,
		bgOutline: any,
		bgOutlineThickness: any,
		shadowColour: any,
		shadowBlur: any,
		shadowOffsets: any,
		padding: any,
		radius: any,
	) {
		let cv: HTMLCanvasElement | null;
		let cw: number;
		let ch: number;
		let c: CanvasRenderingContext2D;
		let x1: number,
			x2: number,
			y1: number,
			y2: number;
		let offx: number,
			offy: number;
		let ix: number,
			iy: number,
			iw: number,
			ih: number;
		let rr: number;
		const sox = abs(shadowOffsets[0]);
		const soy = abs(shadowOffsets[1]);
		let shadowcv: HTMLCanvasElement | null | undefined;
		let shadowc: CanvasRenderingContext2D | undefined;

		padding = max(padding, sox + shadowBlur, soy + shadowBlur);
		x1 = 2 * (padding + bgOutlineThickness);
		y1 = 2 * (padding + bgOutlineThickness);
		cw = this.width + x1;
		ch = this.height + y1;
		offx = offy = padding + bgOutlineThickness;

		if (this.image) {
			ix = iy = padding + bgOutlineThickness;
			iw = this.iwidth!;
			ih = this.iheight!;
			if (this.ipos === 'top' || this.ipos === 'bottom') {
				if (iw < this.width) ix += this.Align(iw, this.width, this.ialign);
				else offx += this.Align(this.width, iw, this.align);
				if (this.ipos === 'top') offy += ih + this.ipad!;
				else iy += this.height + this.ipad!;
				cw = max(cw, iw + x1);
				ch += ih + this.ipad!;
			} else {
				if (ih < this.height) iy += this.Align(ih, this.height, this.ivalign);
				else offy += this.Align(this.height, ih, this.valign);
				if (this.ipos === 'right') ix += this.width + this.ipad!;
				else offx += iw + this.ipad!;
				cw += iw + this.ipad!;
				ch = max(ch, ih + y1);
			}
		}

		cv = NewCanvas(cw, ch);
		if (!cv) return null;

		x1 = y1 = bgOutlineThickness / 2;
		x2 = cw - bgOutlineThickness;
		y2 = ch - bgOutlineThickness;
		rr = min(radius, x2 / 2, y2 / 2);
		c = cv.getContext('2d')!;

		if (bgColour) {
			c.fillStyle = bgColour;
			RRect(c, x1, y1, x2, y2, rr);
		}
		if (bgOutlineThickness) {
			c.strokeStyle = bgOutline;
			c.lineWidth = bgOutlineThickness;
			RRect(c, x1, y1, x2, y2, rr, true);
		}

		if (shadowBlur || sox || soy) {
			shadowcv = NewCanvas(cw, ch);
			if (shadowcv) {
				shadowc = c;
				c = shadowcv.getContext('2d')!;
			}
		}

		TextSet(c, this.font, colour, this.strings, offx, offy, 0, 0, [], this.maxWidth, this.stringWidths, this.align);

		if (this.image) c.drawImage(this.image, ix!, iy!, iw!, ih!);

		if (shadowc && shadowcv) {
			c = shadowc;
			shadowColour && (c.shadowColor = shadowColour);
			shadowBlur && (c.shadowBlur = shadowBlur);
			c.shadowOffsetX = shadowOffsets[0];
			c.shadowOffsetY = shadowOffsets[1];
			c.drawImage(shadowcv, 0, 0);
		}
		return cv;
	}
}

function ExpandImage(i: CanvasImageSource, w: number, h: number) {
	const cv = NewCanvas(w, h);
	if (!cv) return null;
	const c = cv.getContext('2d')!;
	c.drawImage(i as any, (w - (i as any).width) / 2, (h - (i as any).height) / 2);
	return cv;
}

function ScaleImage(i: CanvasImageSource, w: number, h: number) {
	const cv = NewCanvas(w, h);
	if (!cv) return null;
	const c = cv.getContext('2d')!;
	c.drawImage(i, 0, 0, w, h);
	return cv;
}

function AddBackgroundToImage(
	i: any,
	w: number,
	h: number,
	scale: number,
	colour: any,
	othickness: number,
	ocolour: any,
	padding: number,
	radius: number,
	ofill?: any,
) {
	const cw = w + ((2 * padding + othickness) * scale);
	const ch = h + ((2 * padding + othickness) * scale);
	const cv = NewCanvas(cw, ch);
	if (!cv) return null;

	othickness *= scale;
	radius *= scale;
	let x1 = othickness / 2;
	let y1 = x1;
	const x2 = cw - othickness;
	const y2 = ch - othickness;
	padding = padding * scale + x1;
	const c = cv.getContext('2d')!;
	const rr = min(radius, x2 / 2, y2 / 2);

	if (colour) {
		c.fillStyle = colour;
		RRect(c, x1, y1, x2, y2, rr);
	}
	if (othickness) {
		c.strokeStyle = ocolour;
		c.lineWidth = othickness;
		RRect(c, x1, y1, x2, y2, rr, true);
	}

	if (ofill) {
		const ocanvas2 = NewCanvas(cw, ch);
		const cc = ocanvas2?.getContext('2d')!;
		cc.drawImage(i, padding, padding, w, h);
		cc.globalCompositeOperation = 'source-in';
		cc.fillStyle = ocolour;
		cc.fillRect(0, 0, cw, ch);
		cc.globalCompositeOperation = 'destination-over';
		cc.drawImage(cv, 0, 0);
		cc.globalCompositeOperation = 'source-over';
		c.drawImage(ocanvas2!, 0, 0);
	} else {
		c.drawImage(i, padding, padding, i.width, i.height);
	}
	return { image: cv, width: cw / scale, height: ch / scale };
}

function RoundImage(i: any, r: any, iw: number, ih: number, s: number) {
	const cv = NewCanvas(iw, ih);
	if (!cv) return null;
	let r1 = parseFloat(r);
	const l = max(iw, ih);
	if (r.indexOf('%') > 0) r1 = (l * r1) / 100;
	else r1 = r1 * s;
	const c = cv.getContext('2d')!;
	c.globalCompositeOperation = 'source-over';
	c.fillStyle = '#fff';
	if (r1 >= l / 2) {
		r1 = min(iw, ih) / 2;
		c.beginPath();
		c.moveTo(iw / 2, ih / 2);
		c.arc(iw / 2, ih / 2, r1, 0, 2 * Math.PI, false);
		c.fill();
		c.closePath();
	} else {
		r1 = min(iw / 2, ih / 2, r1);
		RRect(c, 0, 0, iw, ih, r1, true);
		c.fill();
	}
	c.globalCompositeOperation = 'source-in';
	c.drawImage(i, 0, 0, iw, ih);
	return cv;
}

function AddShadowToImage(i: any, w: number, h: number, scale: number, sc: any, sb: number, so: number[]) {
	const sw = abs(so[0]);
	const sh = abs(so[1]);
	const cw = w + (sw > sb ? sw + sb : sb * 2) * scale;
	const ch = h + (sh > sb ? sh + sb : sb * 2) * scale;
	const xo = scale * ((sb || 0) + (so[0] < 0 ? sw : 0));
	const yo = scale * ((sb || 0) + (so[1] < 0 ? sh : 0));
	const cv = NewCanvas(cw, ch);
	if (!cv) return null;
	const c = cv.getContext('2d')!;
	sc && (c.shadowColor = sc);
	sb && (c.shadowBlur = sb * scale);
	so && ((c.shadowOffsetX = so[0] * scale), (c.shadowOffsetY = so[1] * scale));
	c.drawImage(i, xo, yo, w, h);
	return { image: cv, width: cw / scale, height: ch / scale };
}

function FindTextBoundingBox(s: string[], f: string, ht: number) {
	const w = parseInt((s.toString().length * ht) as any);
	const h = parseInt((ht * 2 * s.length) as any);
	let cv = NewCanvas(w, h);
	if (!cv) return null;
	const c = cv.getContext('2d')!;
	c.fillStyle = '#000';
	c.fillRect(0, 0, w, h);
	TextSet(c, ht + 'px ' + f, '#fff', s, 0, 0, 0, 0, [], 'centre');
	const idata = c.getImageData(0, 0, w, h);
	const w1 = idata.width;
	const h1 = idata.height;
	const ex = {
		min: { x: w1, y: h1 },
		max: { x: -1, y: -1 },
	};
	for (let y = 0; y < h1; ++y) {
		for (let x = 0; x < w1; ++x) {
			const i = (y * w1 + x) * 4;
			if (idata.data[i + 1] > 0) {
				if (x < ex.min.x) ex.min.x = x;
				if (x > ex.max.x) ex.max.x = x;
				if (y < ex.min.y) ex.min.y = y;
				if (y > ex.max.y) ex.max.y = y;
			}
		}
	}
	if (w1 !== w) {
		ex.min.x *= w / w1;
		ex.max.x *= w / w1;
	}
	if (h1 !== h) {
		ex.min.y *= w / h1;
		ex.max.y *= w / h1;
	}
	cv = null;
	return ex;
}

function FixFont(f: string) {
	return "'" + f.replace(/(\'|\")/g, '').replace(/\s*,\s*/g, "', '") + "'";
}

function AddHandler(h: string, f: EventListener, e?: EventTarget | Document) {
	const target: any = e || doc;
	if (target.addEventListener) target.addEventListener(h, f, false);
	else target.attachEvent?.('on' + h, f);
}

function RemoveHandler(h: string, f: EventListener, e?: EventTarget | Document) {
	const target: any = e || doc;
	if (target.removeEventListener) target.removeEventListener(h, f);
	else target.detachEvent?.('on' + h, f);
}

function AddImage(i: any, o: any, alt: any, t: any, tc: any) {
	const s = tc.imageScale;
	let mscale: number;
	let ic: any;
	let bc: any;
	let oc: any;
	let iw: any;
	let ih: any;

	if (!o.complete) return AddHandler('load', function () { AddImage(i, o, alt, t, tc); }, o);
	if (!i.complete) return AddHandler('load', function () { AddImage(i, o, alt, t, tc); }, i);
	if (alt && !alt.complete) return AddHandler('load', function () { AddImage(i, o, alt, t, tc); }, alt);

	o.width = o.width;
	o.height = o.height;

	if (s) {
		i.width = o.width * s;
		i.height = o.height * s;
	}
	t.iw = i.width;
	t.ih = i.height;

	if (tc.txtOpt) {
		ic = i;
		mscale = tc.zoomMax * tc.txtScale;
		iw = t.iw * mscale;
		ih = t.ih * mscale;
		if (iw < o.naturalWidth || ih < o.naturalHeight) {
			ic = ScaleImage(i, iw, ih);
			if (ic) t.fimage = ic;
		} else {
			iw = t.iw;
			ih = t.ih;
			mscale = 1;
		}

		if (parseFloat(tc.imageRadius)) t.image = t.fimage = i = RoundImage(t.image, tc.imageRadius, iw, ih, mscale);

		if (!t.HasText()) {
			if (tc.shadow) {
				ic = AddShadowToImage(t.image, iw, ih, mscale, tc.shadow, tc.shadowBlur, tc.shadowOffset);
				if (ic) {
					t.fimage = ic.image;
					t.w = ic.width;
					t.h = ic.height;
				}
			}
			if (tc.bgColour || tc.bgOutlineThickness) {
				bc = tc.bgColour === 'tag' ? GetProperty(t.a, 'background-color') : tc.bgColour;
				oc = tc.bgOutline === 'tag' ? GetProperty(t.a, 'color') : (tc.bgOutline || tc.textColour);
				iw = t.fimage.width;
				ih = t.fimage.height;
				if (tc.outlineMethod === 'colour') {
					ic = AddBackgroundToImage(t.fimage, iw, ih, mscale, bc, tc.bgOutlineThickness, t.outline.colour, tc.padding, tc.bgRadius, 1);
					if (ic) t.oimage = ic.image;
				}
				ic = AddBackgroundToImage(t.fimage, iw, ih, mscale, bc, tc.bgOutlineThickness, oc, tc.padding, tc.bgRadius);
				if (ic) {
					t.fimage = ic.image;
					t.w = ic.width;
					t.h = ic.height;
				}
			}
			if (tc.outlineMethod === 'size') {
				if (tc.outlineIncrease > 0) {
					t.iw += 2 * tc.outlineIncrease;
					t.ih += 2 * tc.outlineIncrease;
					iw = mscale * t.iw;
					ih = mscale * t.ih;
					ic = ScaleImage(t.fimage, iw, ih);
					t.oimage = ic;
					t.fimage = ExpandImage(t.fimage, t.oimage.width, t.oimage.height);
				} else {
					iw = mscale * (t.iw + 2 * tc.outlineIncrease);
					ih = mscale * (t.ih + 2 * tc.outlineIncrease);
					ic = ScaleImage(t.fimage, iw, ih);
					t.oimage = ExpandImage(ic, t.fimage.width, t.fimage.height);
				}
			}
		}
	}

	t.alt = alt;
	t.Init();
}

function GetProperty(e: Element, p: string) {
	const dv: any = (doc as any).defaultView;
	const pc = p.replace(/\-([a-z])/g, function (a) {
		return a.charAt(1).toUpperCase();
	});
	return (
		(dv && dv.getComputedStyle && dv.getComputedStyle(e, null).getPropertyValue(p)) ||
		((e as any).currentStyle && (e as any).currentStyle[pc])
	);
}

function FindWeight(a: any, wFrom: any, tHeight: any) {
	let w = 1;
	let p: any;
	if (wFrom) {
		w = 1 * (a.getAttribute(wFrom) || tHeight);
	} else if ((p = GetProperty(a, 'font-size'))) {
		w =
			(p.indexOf('px') > -1 && p.replace('px', '') * 1) ||
			(p.indexOf('pt') > -1 && p.replace('pt', '') * 1.25) ||
			p * 3.3;
	}
	return w;
}

function EventToCanvasId(e: any) {
	if (e?.target && Defined(e.target.id)) return e.target.id;
	if (e?.currentTarget && Defined(e.currentTarget.id)) return e.currentTarget.id;
	return e?.srcElement?.parentNode?.id;
}

function AbsPos(id: string): XY {
	const e = doc.getElementById(id)!;
	const r = e.getBoundingClientRect();
	const dd = doc.documentElement;
	const b = doc.body;
	const w = window;
	const xs = w.pageXOffset || dd.scrollLeft;
	const ys = w.pageYOffset || dd.scrollTop;
	const xo = dd.clientLeft || b.clientLeft;
	const yo = dd.clientTop || b.clientTop;
	return { x: r.left + xs - xo, y: r.top + ys - yo };
}

function EventXY(e: any, c: HTMLCanvasElement): XY | undefined {
	let xy: XY | undefined;
	const xmul = parseInt(GetProperty(c, 'width') as any) / c.width;
	const ymul = parseInt(GetProperty(c, 'height') as any) / c.height;

	if (Defined(e.offsetX)) {
		xy = { x: e.offsetX, y: e.offsetY };
	} else {
		const p = AbsPos(c.id);
		if (Defined(e.changedTouches)) e = e.changedTouches[0];
		if (e.pageX) xy = { x: e.pageX - p.x, y: e.pageY - p.y };
	}
	if (xy && xmul && ymul) {
		xy.x /= xmul;
		xy.y /= ymul;
	}
	return xy;
}

function MouseOut(e: any) {
	const cv = e.target || e.fromElement?.parentNode;
	const tc = (TagCanvas as any).tc[cv.id];
	if (tc) {
		tc.mx = tc.my = -1;
		tc.UnFreeze();
		tc.EndDrag();
	}
}

function MouseMove(e: any) {
	const t: any = TagCanvas;
	const tg = EventToCanvasId(e);
	for (const i in t.tc) {
		const tc = t.tc[i];
		if (tc.tttimer) {
			clearTimeout(tc.tttimer);
			tc.tttimer = null;
		}
	}
	if (tg && t.tc[tg]) {
		const tc = t.tc[tg];
		const p = EventXY(e, tc.canvas);
		if (p) {
			tc.mx = p.x;
			tc.my = p.y;
			tc.Drag(e, p);
		}
		tc.drawn = 0;
	}
}

function MouseDown(e: any) {
	const t: any = TagCanvas;
	const cb = (doc as any).addEventListener ? 0 : 1;
	const tg = EventToCanvasId(e);
	if (tg && e.button === cb && t.tc[tg]) {
		t.tc[tg].BeginDrag(e);
	}
}

function MouseUp(e: any) {
	const t: any = TagCanvas;
	const cb = (doc as any).addEventListener ? 0 : 1;
	const tg = EventToCanvasId(e);
	if (tg && e.button === cb && t.tc[tg]) {
		const tc = t.tc[tg];
		MouseMove(e);
		if (!tc.EndDrag() && !tc.touchState) tc.Clicked(e);
	}
}

function TouchDown(e: any) {
	const tg = EventToCanvasId(e);
	const tc = tg && (TagCanvas as any).tc[tg];
	if (tc && e.changedTouches) {
		if (e.touches.length === 1 && tc.touchState === 0) {
			tc.touchState = 1;
			tc.BeginDrag(e);
			const p = EventXY(e, tc.canvas);
			if (p) {
				tc.mx = p.x;
				tc.my = p.y;
				tc.drawn = 0;
			}
		} else if (e.targetTouches.length === 2 && tc.pinchZoom) {
			tc.touchState = 3;
			tc.EndDrag();
			tc.BeginPinch(e);
		} else {
			tc.EndDrag();
			tc.EndPinch();
			tc.touchState = 0;
		}
	}
}

function TouchUp(e: any) {
	const tg = EventToCanvasId(e);
	const tc = tg && (TagCanvas as any).tc[tg];
	if (tc && e.changedTouches) {
		switch (tc.touchState) {
			case 1:
				tc.Draw();
				tc.Clicked();
				break;
			case 2:
				tc.EndDrag();
				break;
			case 3:
				tc.EndPinch();
				break;
		}
		tc.touchState = 0;
	}
}

function TouchMove(e: any) {
	const t: any = TagCanvas;
	const tg = EventToCanvasId(e);
	for (const i in t.tc) {
		const tc = t.tc[i];
		if (tc.tttimer) {
			clearTimeout(tc.tttimer);
			tc.tttimer = null;
		}
	}
	const tc = tg && t.tc[tg];
	if (tc && e.changedTouches && tc.touchState) {
		switch (tc.touchState) {
			case 1:
			case 2: {
				const p = EventXY(e, tc.canvas);
				if (p) {
					tc.mx = p.x;
					tc.my = p.y;
					if (tc.Drag(e, p)) tc.touchState = 2;
				}
				break;
			}
			case 3:
				tc.Pinch(e);
				break;
		}
		tc.drawn = 0;
	}
}

function MouseWheel(e: any) {
	const t: any = TagCanvas;
	const tg = EventToCanvasId(e);
	if (tg && t.tc[tg]) {
		e.cancelBubble = true;
		e.returnValue = false;
		e.preventDefault && e.preventDefault();
		t.tc[tg].Wheel((e.wheelDelta || e.detail) > 0);
	}
}

function Scroll(_e: any) {
	const t: any = TagCanvas;
	clearTimeout(t.scrollTimer);
	for (const i in t.tc) t.tc[i].Pause();
	t.scrollTimer = setTimeout(function () {
		const t: any = TagCanvas;
		for (const i in t.tc) t.tc[i].Resume();
	}, t.scrollPause);
}

function DrawCanvas() {
	DrawCanvasRAF(TimeNow());
}

function DrawCanvasRAF(t?: number) {
	const tc: any = (TagCanvas as any).tc;
	(TagCanvas as any).NextFrame((TagCanvas as any).interval);
	t = t || TimeNow();
	for (const i in tc) tc[i].Draw(t);
}

function NextFrameRAF() {
	requestAnimationFrame(DrawCanvasRAF);
}

function NextFrameTimeout(iv: number) {
	setTimeout(DrawCanvas, iv);
}

function Project(tc: any, p1: any, sx: number, sy: number) {
	const m = (tc.radius * tc.z1) / (tc.z1 + tc.z2 + p1.z);
	return {
		x: p1.x * m * sx,
		y: p1.y * m * sy,
		z: p1.z,
		w: (tc.z1 - p1.z) / tc.z2,
	};
}

class TextSplitter {
	br = 0;
	line: string[] = [];
	text: string[] = [];
	original: string;
	constructor(public e: any) {
		this.original = e.innerText || e.textContent;
	}

	Empty() {
		for (let i = 0; i < this.text.length; ++i) if (this.text[i].length) return false;
		return true;
	}

	Lines(e?: any) {
		const r = e ? 1 : 0;
		e = e || this.e;
		const cn = e.childNodes;
		const cl = cn.length;
		for (let i = 0; i < cl; ++i) {
			if (cn[i].nodeName === 'BR') {
				this.text.push(this.line.join(' '));
				this.br = 1;
			} else if (cn[i].nodeType === 3) {
				if (this.br) {
					this.line = [cn[i].nodeValue];
					this.br = 0;
				} else {
					this.line.push(cn[i].nodeValue);
				}
			} else {
				this.Lines(cn[i]);
			}
		}
		r || this.br || this.text.push(this.line.join(' '));
		return this.text;
	}

	SplitWidth(w: number, c: CanvasRenderingContext2D, f: string, h: number) {
		const text: string[] = [];
		c.font = h + 'px ' + f;
		for (let i = 0; i < this.text.length; ++i) {
			const words = this.text[i].split(/\s+/);
			this.line = [words[0]];
			for (let j = 1; j < words.length; ++j) {
				if (c.measureText(this.line.join(' ') + ' ' + words[j]).width > w) {
					text.push(this.line.join(' '));
					this.line = [words[j]];
				} else {
					this.line.push(words[j]);
				}
			}
			text.push(this.line.join(' '));
		}
		this.text = text;
		return this.text;
	}
}

class Outline {
	ts: number | null = null;
	x = 0;
	y = 0;
	w = 0;
	h = 0;
	sc = 1;
	z = 0;
	pulse = 1;
	pulsate: boolean;
	colour: any;
	adash: number;
	agap: number;
	aspeed: number;
	radius: number;
	drawFunc?: (...args: any[]) => any;
	RealPreDraw?: any;

	constructor(
		public tc: any,
		public tag: any,
	) {
		this.pulsate = tc.pulsateTo < 1;
		this.colour = tc.outlineColour;
		this.adash = ~~tc.outlineDash;
		this.agap = ~~tc.outlineDashSpace || this.adash;
		this.aspeed = tc.outlineDashSpeed * 1;
		if (this.colour === 'tag') this.colour = GetProperty(tag.a, 'color');
		else if (this.colour === 'tagbg') this.colour = GetProperty(tag.a, 'background-color');
		this.Draw = this.pulsate ? this.DrawPulsate : this.DrawSimple;
		this.radius = tc.outlineRadius | 0;
		this.SetMethod(tc.outlineMethod, tc.altImage);
	}

	SetMethod(om: any, alt: any) {
		const methods: Record<string, [string, string?]> = {
			block: ['PreDraw', 'DrawBlock'],
			colour: ['PreDraw', 'DrawColour'],
			outline: ['PostDraw', 'DrawOutline'],
			classic: ['LastDraw', 'DrawOutline'],
			size: ['PreDraw', 'DrawSize'],
			none: ['LastDraw'],
		};
		const funcs = methods[om] || methods.outline;
		if (om === 'none') {
			this.Draw = function () {
				return 1;
			};
		} else {
			this.drawFunc = (this as any)[funcs[1]!];
		}
		(this as any)[funcs[0]] = this.Draw;
		if (alt) {
			this.RealPreDraw = this.PreDraw;
			this.PreDraw = this.DrawAlt;
		}
	}

	Update(x: number, y: number, w: number, h: number, sc: number, z: number, xo: number, yo: number) {
		const o = this.tc.outlineOffset;
		const o2 = 2 * o;
		this.x = sc * x + xo - o;
		this.y = sc * y + yo - o;
		this.w = sc * w + o2;
		this.h = sc * h + o2;
		this.sc = sc;
		this.z = z;
	}

	Ants(c: CanvasRenderingContext2D) {
		if (!this.adash) return;
		let l = this.adash;
		let g = this.agap;
		let s = this.aspeed;
		const length = l + g;
		let l1 = 0,
			l2 = l,
			g1 = g,
			g2 = 0;
		if (s) {
			let seq = abs(s) * ((TimeNow() - (this.ts as any)) / 50);
			if (s < 0) seq = 8.64e6 - seq;
			s = ~~seq % length;
		}
		let ants: number[];
		if (s) {
			if (l >= s) {
				l1 = l - s;
				l2 = s;
			} else {
				g1 = length - s;
				g2 = g - g1;
			}
			ants = [l1, g1, l2, g2];
		} else {
			ants = [l, g];
		}
		c.setLineDash(ants);
	}

	DrawOutline(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: any) {
		const r = min(this.radius, h / 2, w / 2);
		c.strokeStyle = colour;
		this.Ants(c);
		RRect(c, x, y, w, h, r, true);
	}

	DrawSize(c: CanvasRenderingContext2D, _x: number, _y: number, _w: number, _h: number, _colour: any, tag: any, x1: number, y1: number) {
		const tw = tag.w;
		const th = tag.h;
		let i: any;
		if (this.pulsate) {
			let sc: number;
			if (tag.image) sc = (tag.image.height + this.tc.outlineIncrease) / tag.image.height;
			else sc = tag.oscale;
			i = tag.fimage || tag.image;
			const m = 1 + (sc - 1) * (1 - this.pulse);
			tag.h *= m;
			tag.w *= m;
		} else {
			i = tag.oimage;
		}
		tag.alpha = 1;
		tag.Draw(c, x1, y1, i);
		tag.h = th;
		tag.w = tw;
		return 1;
	}

	DrawColour(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: any, tag: any, x1: number, y1: number) {
		if (tag.oimage) {
			if (this.pulse < 1) {
				tag.alpha = 1 - pow(this.pulse, 2);
				tag.Draw(c, x1, y1, tag.fimage);
				tag.alpha = this.pulse;
			} else {
				tag.alpha = 1;
			}
			tag.Draw(c, x1, y1, tag.oimage);
			return 1;
		}
		return (this as any)[tag.image ? 'DrawColourImage' : 'DrawColourText'](c, x, y, w, h, colour, tag, x1, y1);
	}

	DrawColourText(c: CanvasRenderingContext2D, _x: number, _y: number, _w: number, _h: number, colour: any, tag: any, x1: number, y1: number) {
		const normal = tag.colour;
		tag.colour = colour;
		tag.alpha = 1;
		tag.Draw(c, x1, y1);
		tag.colour = normal;
		return 1;
	}

	DrawColourImage(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: any, tag: any, x1: number, y1: number) {
		const ccanvas = c.canvas;
		const fx = ~~max(x, 0);
		const fy = ~~max(y, 0);
		const fw = (min(ccanvas.width - fx, w) + 0.5) | 0;
		const fh = (min(ccanvas.height - fy, h) + 0.5) | 0;

		if (ocanvas) {
			ocanvas.width = fw;
			ocanvas.height = fh;
		} else {
			ocanvas = NewCanvas(fw, fh);
		}
		if (!ocanvas) {
			this.SetMethod('outline', undefined);
			return 0;
		}
		const cc = ocanvas.getContext('2d')!;
		cc.drawImage(ccanvas, fx, fy, fw, fh, 0, 0, fw, fh);
		c.clearRect(fx, fy, fw, fh);
		tag.alpha = this.pulsate ? 1 - pow(this.pulse, 2) : 1;
		tag.Draw(c, x1, y1);
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.save();
		c.beginPath();
		c.rect(fx, fy, fw, fh);
		c.clip();
		c.globalCompositeOperation = 'source-in';
		c.fillStyle = colour;
		c.fillRect(fx, fy, fw, fh);
		c.restore();
		c.globalAlpha = 1;
		c.globalCompositeOperation = 'destination-over';
		c.drawImage(ocanvas, 0, 0, fw, fh, fx, fy, fw, fh);
		c.globalCompositeOperation = 'source-over';
		return 1;
	}

	DrawAlt(c: CanvasRenderingContext2D, tag: any, x1: number, y1: number, ga: any, useGa: any) {
		const r = (this.RealPreDraw as any)(c, tag, x1, y1, ga, useGa);
		if (tag.alt) {
			tag.DrawImage(c, x1, y1, tag.alt);
			return 1;
		}
		return r;
	}

	DrawBlock(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: any) {
		const r = min(this.radius, h / 2, w / 2);
		c.fillStyle = colour;
		RRect(c, x, y, w, h, r);
	}

	DrawSimple(c: CanvasRenderingContext2D, tag: any, x1: number, y1: number, ga?: any, useGa?: any) {
		const t = this.tc;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.strokeStyle = this.colour;
		c.lineWidth = t.outlineThickness;
		c.shadowBlur = 0;
		c.shadowOffsetX = 0;
		c.shadowOffsetY = 0;
		c.globalAlpha = useGa ? ga : 1;
		return (this.drawFunc as any)(c, this.x, this.y, this.w, this.h, this.colour, tag, x1, y1);
	}

	DrawPulsate(c: CanvasRenderingContext2D, tag: any, x1: number, y1: number) {
		const diff = TimeNow() - (this.ts as any);
		const t = this.tc;
		let ga =
			t.pulsateTo +
			(1 - t.pulsateTo) * (0.5 + cos((2 * Math.PI * diff) / (1000 * t.pulsateTime)) / 2);
		this.pulse = ga = (TagCanvas as any).Smooth(1, ga);
		return this.DrawSimple(c, tag, x1, y1, ga, 1);
	}

	Active(_c: CanvasRenderingContext2D, x: number, y: number) {
		const a = x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h;
		if (a) this.ts = this.ts || TimeNow();
		else this.ts = null;
		return a;
	}

	PreDraw: any = Nop;
	PostDraw: any = Nop;
	LastDraw: any = Nop;
	Draw: any = Nop;
}

class Tag {
	image: any = null;
	fimage: any;
	oimage: any;
	alt: any;
	track: any;
	gain: any;
	playing: any;
	stopped: any;
	xformed: any;
	oscale: any;
	shadow?: any;
	text_original: any;
	line_widths: number[] = [];
	title: any;
	x = 0;
	y = 0;
	z = 0;
	sc = 1;
	alpha = 1;
	weighted: boolean;
	outline: Outline;
	audio: HTMLAudioElement | null = null;

	textHeight: any;
	font: any;
	iw: any;
	ih: any;

	constructor(
		public tc: any,
		public text: any,
		public a: any,
		v: any,
		public w: any,
		public h: any,
		public colour?: any,
		public bgColour?: any,
		public bgRadius?: any,
		public bgOutline?: any,
		public bgOutlineThickness?: any,
		public textFont?: any,
		public padding?: any,
		original?: any,
	) {
		this.text_original = original;
		this.title = a.title || null;
		this.position = new Vector(v[0], v[1], v[2]);
		this.colour = colour || tc.textColour;
		this.bgColour = bgColour || tc.bgColour;
		this.bgRadius = (bgRadius | 0) as any;
		this.bgOutline = bgOutline || this.colour;
		this.bgOutlineThickness = (bgOutlineThickness | 0) as any;
		this.textFont = textFont || tc.textFont;
		this.padding = (padding | 0) as any;
		this.weighted = !tc.weight;
		this.outline = new Outline(tc, this);
	}

	position: Vector;

	Init(_e?: any) {
		const tc = this.tc;
		this.textHeight = tc.textHeight;
		if (this.HasText()) this.Measure(tc.ctxt, tc);
		else {
			this.w = this.iw;
			this.h = this.ih;
		}

		this.SetShadowColour = tc.shadowAlpha ? this.SetShadowColourAlpha : this.SetShadowColourFixed;
		this.SetDraw(tc);
	}

	Draw: any = Nop;

	HasText() {
		return this.text && this.text[0].length > 0;
	}

	EqualTo(e: any) {
		const i = e.getElementsByTagName('img');
		if (this.a.href !== e.href) return 0;
		if (i.length) return this.image.src === i[0].src;
		return (e.innerText || e.textContent) === this.text_original;
	}

	SetImage(i: any) {
		this.image = this.fimage = i;
	}

	SetAudio(a: HTMLAudioElement) {
		this.audio = a;
		this.audio.load();
	}

	SetDraw(t: any) {
		this.Draw = this.fimage ? (t.ie > 7 ? this.DrawImageIE : this.DrawImage) : this.DrawText;
		t.noSelect && (this.CheckActive = () => null);
	}

	MeasureText(c: CanvasRenderingContext2D) {
		const l = this.text.length;
		let w = 0;
		for (let i = 0; i < l; ++i) {
			const wl = c.measureText(this.text[i]).width;
			this.line_widths[i] = wl;
			w = max(w, wl);
		}
		return w;
	}

	Measure(c: CanvasRenderingContext2D, t: any) {
		let extents = FindTextBoundingBox(this.text, this.textFont, this.textHeight);
		let theight = extents ? extents.max.y + extents.min.y : this.textHeight;
		c.font = this.font = this.textHeight + 'px ' + this.textFont;
		let twidth = this.MeasureText(c);

		if (t.txtOpt) {
			const s = t.txtScale;
			let th = s * this.textHeight;
			let f = th + 'px ' + this.textFont;
			const soff = [s * t.shadowOffset[0], s * t.shadowOffset[1]];
			c.font = f;
			const cw = this.MeasureText(c);
			let tcv = new TextCanvas(this.text, f, cw + s, s * theight + s, cw, this.line_widths, t.textAlign, t.textVAlign, s);
			if (this.image) tcv.SetImage(this.image, this.iw, this.ih, t.imagePosition, t.imagePadding, t.imageAlign, t.imageVAlign, t.imageScale);
			let img: any = tcv.Create(this.colour, this.bgColour, this.bgOutline, s * this.bgOutlineThickness, t.shadow, s * t.shadowBlur, soff, s * this.padding, s * this.bgRadius);

			if (t.outlineMethod === 'colour') {
				this.oimage = tcv.Create(this.outline.colour, this.bgColour, this.outline.colour, s * this.bgOutlineThickness, t.shadow, s * t.shadowBlur, soff, s * this.padding, s * this.bgRadius);
			} else if (t.outlineMethod === 'size') {
				const ext2 = FindTextBoundingBox(this.text, this.textFont, this.textHeight + t.outlineIncrease);
				if (ext2) {
					extents = ext2;
					th = extents.max.y + extents.min.y;
				} else {
					th = this.textHeight + t.outlineIncrease;
				}
				f = s * (this.textHeight + t.outlineIncrease) + 'px ' + this.textFont;
				c.font = f;
				const cw2 = this.MeasureText(c);
				tcv = new TextCanvas(this.text, f, cw2 + s, s * th + s, cw2, this.line_widths, t.textAlign, t.textVAlign, s);
				if (this.image) tcv.SetImage(this.image, this.iw + t.outlineIncrease, this.ih + t.outlineIncrease, t.imagePosition, t.imagePadding, t.imageAlign, t.imageVAlign, t.imageScale);
				this.oimage = tcv.Create(this.colour, this.bgColour, this.bgOutline, s * this.bgOutlineThickness, t.shadow, s * t.shadowBlur, soff, s * this.padding, s * this.bgRadius);
				this.oscale = this.oimage.width / img.width;
				if (t.outlineIncrease > 0) img = ExpandImage(img, this.oimage.width, this.oimage.height);
				else this.oimage = ExpandImage(this.oimage, img.width, img.height);
			}

			if (img) {
				this.fimage = img;
				twidth = this.fimage.width / s;
				theight = this.fimage.height / s;
			}
			this.SetDraw(t);
			t.txtOpt = !!this.fimage;
		}

		this.h = theight;
		this.w = twidth;
	}

	SetFont(f: any, c: any, bc: any, boc: any) {
		this.textFont = f;
		this.colour = c;
		this.bgColour = bc;
		this.bgOutline = boc;
		this.Measure(this.tc.ctxt, this.tc);
	}

	SetWeight(w: any[]) {
		const tc = this.tc;
		const modes = tc.weightMode.split(/[, ]/);
		const wl = w.length;
		if (!this.HasText()) return;
		this.weighted = true;
		for (let s = 0; s < wl; ++s) {
			const m = modes[s] || 'size';
			if (m === 'both') {
				this.Weight(w[s], tc.ctxt, tc, 'size', tc.min_weight[s], tc.max_weight[s], s);
				this.Weight(w[s], tc.ctxt, tc, 'colour', tc.min_weight[s], tc.max_weight[s], s);
			} else {
				this.Weight(w[s], tc.ctxt, tc, m, tc.min_weight[s], tc.max_weight[s], s);
			}
		}
		this.Measure(tc.ctxt, tc);
	}

	Weight(w: any, _c: any, t: any, m: any, wmin: any, wmax: any, wnum: any) {
		w = Number.isNaN(w) ? 1 : w;
		const nweight = (w - wmin) / (wmax - wmin);
		if (m === 'colour') this.colour = FindGradientColour(t, nweight, wnum);
		else if (m === 'bgcolour') this.bgColour = FindGradientColour(t, nweight, wnum);
		else if (m === 'bgoutline') this.bgOutline = FindGradientColour(t, nweight, wnum);
		else if (m === 'outline') this.outline.colour = FindGradientColour(t, nweight, wnum);
		else if (m === 'size') {
			if (t.weightSizeMin > 0 && t.weightSizeMax > t.weightSizeMin) {
				this.textHeight = t.weightSize * (t.weightSizeMin + (t.weightSizeMax - t.weightSizeMin) * nweight);
			} else {
				this.textHeight = max(1, w * t.weightSize);
			}
		}
	}

	SetShadowColourFixed(c: any, s: any, _a: any) {
		c.shadowColor = s;
	}
	SetShadowColourAlpha(c: any, s: any, a: any) {
		c.shadowColor = SetAlpha(s, a);
	}
	SetShadowColour: any = this.SetShadowColourFixed;

	DrawText(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
		const t = this.tc;
		let x = this.x;
		let y = this.y;
		const s = this.sc;
		c.globalAlpha = this.alpha;
		c.fillStyle = this.colour;
		t.shadow && this.SetShadowColour(c, t.shadow, this.alpha);
		c.font = this.font;
		x += xoff / s;
		y += yoff / s - this.h / 2;
		for (let i = 0; i < this.text.length; ++i) {
			let xl = x;
			if (t.textAlign === 'right') xl += this.w / 2 - this.line_widths[i];
			else if (t.textAlign === 'centre') xl -= this.line_widths[i] / 2;
			else xl -= this.w / 2;
			c.setTransform(s, 0, 0, s, s * xl, s * y);
			c.fillText(this.text[i], 0, 0);
			y += this.textHeight;
		}
	}

	DrawImage(c: CanvasRenderingContext2D, xoff: number, yoff: number, im?: any) {
		const s = this.sc;
		const i = im || this.fimage;
		const w = this.w;
		const h = this.h;
		const a = this.alpha;
		const shadow = this.shadow;
		c.globalAlpha = a;
		shadow && this.SetShadowColour(c, shadow, a);
		const x = this.x + xoff / s - w / 2;
		const y = this.y + yoff / s - h / 2;
		c.setTransform(s, 0, 0, s, s * x, s * y);
		c.drawImage(i, 0, 0, w, h);
	}

	DrawImageIE(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
		const i = this.fimage;
		const s = this.sc;
		i.width = this.w * s;
		i.height = this.h * s;
		const w = i.width;
		const h = i.height;
		const x = this.x * s + xoff - w / 2;
		const y = this.y * s + yoff - h / 2;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.globalAlpha = this.alpha;
		c.drawImage(i, x, y);
	}

	Calc(m: Matrix, a: number) {
		const t = this.tc;
		const r = t.max_radius;
		let pp: any = m.xform(this.position);
		this.xformed = pp;
		pp = Project(t, pp, t.stretchX, t.stretchY);
		this.x = pp.x;
		this.y = pp.y;
		this.z = pp.z;
		this.sc = pp.w;
		this.alpha = a * Clamp(t.minBrightness + (t.maxBrightness - t.minBrightness) * (r - this.z) / (2 * r), 0, 1);
		return this.xformed;
	}

	UpdateActive(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
		const o = this.outline;
		const w = this.w;
		const h = this.h;
		const x = this.x - w / 2;
		const y = this.y - h / 2;
		o.Update(x, y, w, h, this.sc, this.z, xoff, yoff);
		return o;
	}

	CheckActive(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
		const t = this.tc;
		const o = this.UpdateActive(c, xoff, yoff);
		return o.Active(c, t.mx, t.my) ? o : null;
	}

	Clicked(_e?: any) {
		const a = this.a;
		const t = a.target;
		const h = a.href;
		if (t !== '' && t !== '_self') {
			if ((self as any).frames[t]) {
				(self as any).frames[t].document.location = h;
			} else {
				try {
					if ((top as any).frames[t]) {
						(top as any).frames[t].document.location = h;
						return;
					}
				} catch {}
				window.open(h, t);
			}
			return;
		}
		if (doc.createEvent) {
			const evt = doc.createEvent('MouseEvents');
			evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
			if (!a.dispatchEvent(evt)) return;
		} else if ((a as any).fireEvent) {
			if (!(a as any).fireEvent('onclick')) return;
		}
		(doc as any).location = h;
	}

	StopAudio() {
		this.audio && this.playing && this.audio.pause();
		this.stopped = 1;
		this.playing = 0;
	}

	PlayAudio(): boolean {
		if (this.tc.audioOff) return false;
		if (!audio && !SetupAudio()) return false;
		const ctx = audio;
		if (!ctx || ctx === 'off') return false;

		let a: any = this.tc.audio;
		let g: any = this.tc.gain;
		const sus = 'suspended';
		let p: any;

		if (this.audio) {
			if (!this.track) {
				this.track = ctx.createMediaElementSource(this.audio);
				this.gain = ctx.createGain();
				this.track.connect(this.gain);
				this.gain.connect(ctx.destination);
			}
			a = this.audio;
			g = this.gain;
			if (!a.paused) return true;
		}

		if (a) {
			if ((ctx as any).state === sus) (ctx as any).resume();
			if ((ctx as any).state === sus) return false;
			g.gain.value = min(2, max(0, this.tc.audioVolume * 1));
			a.currentTime = 0;
			this.stopped = 0;
			p = a.play();
			if (p !== undefined) {
				p.then(() => {
					this.stopped ? this.audio?.pause() : (this.playing = 1);
				});
			}
			return true;
		}
		return false;
	}
}

export const defaultTagCanvasOptions: Required<TagCanvasOptions> = {
	z1: 20000,
	z2: 20000,
	z0: 0.0002,
	freezeActive: false,
	freezeDecel: false,
	activeCursor: 'pointer',
	pulsateTo: 1,
	pulsateTime: 3,
	reverse: false,
	depth: 0.5,
	maxSpeed: 0.05,
	minSpeed: 0,
	decel: 0.95,
	interval: 20,
	minBrightness: 0.1,
	maxBrightness: 1,
	outlineColour: '#ffff99',
	outlineThickness: 2,
	outlineOffset: 5,
	outlineMethod: 'outline',
	outlineRadius: 0,
	textColour: '#ff99ff',
	textHeight: 15,
	textFont: 'Helvetica, Arial, sans-serif',
	shadow: '#000',
	shadowBlur: 0,
	shadowOffset: [0, 0],
	initial: null,
	hideTags: true,
	zoom: 1,
	weight: false,
	weightMode: 'size',
	weightFrom: null,
	weightSize: 1,
	weightSizeMin: null,
	weightSizeMax: null,
	weightGradient: { 0: '#f00', 0.33: '#ff0', 0.66: '#0f0', 1: '#00f' },
	txtOpt: true,
	txtScale: 2,
	frontSelect: false,
	wheelZoom: true,
	zoomMin: 0.3,
	zoomMax: 3,
	zoomStep: 0.05,
	shape: 'sphere',
	lock: null,
	tooltip: null,
	tooltipDelay: 300,
	tooltipClass: 'tctooltip',
	radiusX: 1,
	radiusY: 1,
	radiusZ: 1,
	stretchX: 1,
	stretchY: 1,
	offsetX: 0,
	offsetY: 0,
	shuffleTags: false,
	noSelect: false,
	noMouse: false,
	imageScale: 1,
	paused: false,
	dragControl: false,
	dragThreshold: 4,
	centreFunc: Nop as any,
	splitWidth: 0,
	animTiming: 'Smooth',
	clickToFront: false,
	fadeIn: 0,
	padding: 0,
	bgColour: null,
	bgRadius: 0,
	bgOutline: null,
	bgOutlineThickness: 0,
	outlineIncrease: 4,
	textAlign: 'centre',
	textVAlign: 'middle',
	imageMode: null,
	imagePosition: null,
	imagePadding: 2,
	imageAlign: 'centre',
	imageVAlign: 'middle',
	noTagsMessage: true,
	centreImage: null,
	pinchZoom: false,
	repeatTags: 0,
	minTags: 0,
	imageRadius: 0,
	scrollPause: false,
	outlineDash: 0,
	outlineDashSpace: 0,
	outlineDashSpeed: 1,
	activeAudio: '',
	audioVolume: 1,
	audioIcon: 1,
	audioIconSize: 20,
	audioIconThickness: 2,
	audioIconDark: 0,
	altImage: 0,
};

export class TagCanvas {
	static tc: Record<string, any> = {};
	static options: TagCanvasOptions = { ...defaultTagCanvasOptions };
	static NextFrame: any;
	static interval: number;
	static started: number;
	static scrollPause: any = 0;
	static scrollTimer: any = null;
	static loaded: any = 0;

	canvas: HTMLCanvasElement;
	ctxt: CanvasRenderingContext2D;

	// lots of dynamic options/properties; keep as any for compatibility
	[k: string]: any;

	constructor(cid: string, lctr?: string, opt?: TagCanvasOptions) {
		let c = doc.getElementById(cid) as HTMLCanvasElement | null;
		const cp: Array<'id' | 'className' | 'innerHTML'> = ['id', 'className', 'innerHTML'];
		if (!c) throw new Error('Canvas not found');

		if (Defined((window as any).G_vmlCanvasManager)) {
			c = (window as any).G_vmlCanvasManager.initElement(c);
			(this as any).ie = parseFloat(navigator.appVersion.split('MSIE')[1]);
		}
		if (c && (!c.getContext || !c.getContext('2d')!.fillText)) {
			const p = doc.createElement('DIV');
			for (let i = 0; i < cp.length; ++i) (p as any)[cp[i]] = (c as any)[cp[i]];
			c.parentNode!.insertBefore(p, c);
			c.parentNode!.removeChild(c);
			throw new Error('Canvas unsupported');
		}

		for (const i in TagCanvas.options) {
			(this as any)[i] = opt && Defined((opt as any)[i]) ? (opt as any)[i] : (Defined((TagCanvas as any)[i]) ? (TagCanvas as any)[i] : (TagCanvas.options as any)[i]);
		}
		if (!c) throw new Error('Canvas not found');

		this.canvas = c;
		this.ctxt = c.getContext('2d')!;
		this.z1 = 250 / max(this.depth, 0.001);
		this.z2 = this.z1 / this.zoom;
		this.radius = min(c.height, c.width) * 0.0075;
		this.max_radius = 100;
		this.max_weight = [];
		this.min_weight = [];
		this.textFont = this.textFont && FixFont(this.textFont);
		this.textHeight *= 1;
		this.imageRadius = this.imageRadius.toString();
		this.pulsateTo = Clamp(this.pulsateTo, 0, 1);
		this.minBrightness = Clamp(this.minBrightness, 0, 1);
		this.maxBrightness = Clamp(this.maxBrightness, this.minBrightness, 1);
		this.ctxt.textBaseline = 'top';
		this.lx = (this.lock + '').indexOf('x') + 1;
		this.ly = (this.lock + '').indexOf('y') + 1;
		this.frozen = this.dx = this.dy = this.fixedAnim = this.touchState = 0;
		this.fixedAlpha = 1;
		this.source = lctr || cid;
		this.repeatTags = min(64, ~~this.repeatTags);
		this.minTags = min(200, ~~this.minTags);
		if (~~this.scrollPause > 0) TagCanvas.scrollPause = ~~this.scrollPause;
		else this.scrollPause = 0;
		if (this.minTags > 0 && this.repeatTags < 1 && (this as any).GetTags().length) {
			this.repeatTags = ceil(this.minTags / (this as any).GetTags().length) - 1;
		}

		this.transform = Matrix.Identity();
		this.startTime = this.time = TimeNow();
		this.mx = this.my = -1;
		this.centreImage && CentreImage(this);
		this.Animate = this.dragControl ? this.AnimateDrag : this.AnimatePosition;
		this.animTiming = typeof (TagCanvas as any)[this.animTiming] === 'function' ? (TagCanvas as any)[this.animTiming] : TagCanvas.Smooth;

		if (this.shadowBlur || this.shadowOffset[0] || this.shadowOffset[1]) {
			this.ctxt.shadowColor = this.shadow;
			this.shadow = this.ctxt.shadowColor;
			this.shadowAlpha = ShadowAlphaBroken();
		} else {
			delete this.shadow;
		}

		if (this.activeAudio === false) {
			audio = 'off';
		} else {
			this.activeAudio && this.LoadAudio();
		}

		this.Load();
		if (lctr && this.hideTags) {
			((t: any) => {
				if (TagCanvas.loaded) t.HideTags();
				else AddHandler('load', function () { t.HideTags(); }, window);
			})(this);
		}

		this.yaw = this.initial ? this.initial[0] * this.maxSpeed : 0;
		this.pitch = this.initial ? this.initial[1] * this.maxSpeed : 0;

		if (this.tooltip) {
			this.ctitle = c.title;
			c.title = '';
			if (this.tooltip === 'native') {
				this.Tooltip = this.TooltipNative;
			} else {
				this.Tooltip = this.TooltipDiv;
				if (!this.ttdiv) {
					this.ttdiv = doc.createElement('div');
					this.ttdiv.className = this.tooltipClass;
					this.ttdiv.style.position = 'absolute';
					this.ttdiv.style.zIndex = ((c.style.zIndex as any) || 0) + 1;
					AddHandler('mouseover', function (e: any) { e.target.style.display = 'none'; }, this.ttdiv);
					doc.body.appendChild(this.ttdiv);
				}
			}
		} else {
			this.Tooltip = this.TooltipNone;
		}

		if (!this.noMouse && !handlers[cid]) {
			handlers[cid] = [
				['mousemove', MouseMove],
				['mouseout', MouseOut],
				['mouseup', MouseUp],
				['touchstart', TouchDown],
				['touchend', TouchUp],
				['touchcancel', TouchUp],
				['touchmove', TouchMove],
			];
			if (this.dragControl) {
				handlers[cid].push(['mousedown', MouseDown]);
				handlers[cid].push(['selectstart', Nop]);
			}
			if (this.wheelZoom) {
				handlers[cid].push(['mousewheel', MouseWheel]);
				handlers[cid].push(['DOMMouseScroll', MouseWheel]);
			}
			if (this.scrollPause) {
				handlers[cid].push(['scroll', Scroll, window]);
			}
			for (let i = 0; i < handlers[cid].length; ++i) {
				const p = handlers[cid][i];
				AddHandler(p[0], p[1], p[2] ? p[2] : c);
			}
		}

		if (!TagCanvas.started) {
			TagCanvas.NextFrame = (window as any).requestAnimationFrame ? NextFrameRAF : NextFrameTimeout;
			TagCanvas.interval = this.interval;
			TagCanvas.NextFrame(this.interval);
			TagCanvas.started = 1;
		}
	}

	SourceElements() {
		if (doc.querySelectorAll) return doc.querySelectorAll('#' + this.source);
		return [doc.getElementById(this.source)];
	}

	HideTags() {
		const el: any = this.SourceElements();
		for (let i = 0; i < el.length; ++i) el[i].style.display = 'none';
	}

	GetTags() {
		const el: any = this.SourceElements();
		const tl: any[] = [];
		for (let k = 0; k <= this.repeatTags; ++k) {
			for (let i = 0; i < el.length; ++i) {
				const etl = el[i].getElementsByTagName('a');
				for (let j = 0; j < etl.length; ++j) tl.push(etl[j]);
			}
		}
		return tl;
	}

	Message(text: string) {
		const tl: any[] = [];
		const tc = text.split('');
		for (let i = 0; i < tc.length; ++i) {
			if (tc[i] !== ' ') {
				const p = i - tc.length / 2;
				const a = doc.createElement('a') as HTMLAnchorElement;
				a.href = '#';
				a.innerText = tc[i];
				const x = 100 * sin(p / 9);
				const z = -100 * cos(p / 9);
				const t = new Tag(this, tc[i], a, [x, 0, z], 2, 18, '#000', '#fff', 0, 0, 0, 'monospace', 2, tc[i]);
				t.Init();
				tl.push(t);
			}
		}
		return tl;
	}

	AddAudio(e: any, t: any) {
		if (audio === 'off') return;
		const au = e.getElementsByTagName('audio');
		if (au.length) {
			t.SetAudio(au[0]);
			this.hasAudio = 1;
		}
	}

	CreateTag(e: any) {
		let im: any;
		let i: any;
		let t: any;
		let txt: any;
		let ts: any;
		let font: any;
		let bc: any;
		let boc: any;
		const p = [0, 0, 0];

		if ('text' !== this.imageMode) {
			im = e.getElementsByTagName('img');
			if (im.length) {
				i = new Image();
				i.src = im[0].src;
				if (!this.imageMode) {
					t = new Tag(this, '', e, p, 0, 0);
					t.SetImage(i);
					AddImage(i, im[0], im[1], t, this);
					this.AddAudio(e, t);
					return t;
				}
			}
		}
		if ('image' !== this.imageMode) {
			ts = new TextSplitter(e);
			txt = ts.Lines();
			if (!ts.Empty()) {
				font = this.textFont || FixFont(GetProperty(e, 'font-family'));
				if (this.splitWidth) txt = ts.SplitWidth(this.splitWidth, this.ctxt, font, this.textHeight);
				bc = this.bgColour === 'tag' ? GetProperty(e, 'background-color') : this.bgColour;
				boc = this.bgOutline === 'tag' ? GetProperty(e, 'color') : this.bgOutline;
			} else {
				ts = null;
			}
		}
		if (ts || i) {
			t = new Tag(this, txt, e, p, 2, this.textHeight + 2, this.textColour || GetProperty(e, 'color'), bc, this.bgRadius, boc, this.bgOutlineThickness, font, this.padding, ts && ts.original);
			if (i) {
				t.SetImage(i);
				AddImage(i, im[0], im[1], t, this);
			} else {
				t.Init();
			}
			this.AddAudio(e, t);
			return t;
		}
	}

	UpdateTag(t: any, a: any) {
		const colour = this.textColour || GetProperty(a, 'color');
		const font = this.textFont || FixFont(GetProperty(a, 'font-family'));
		const bc = this.bgColour === 'tag' ? GetProperty(a, 'background-color') : this.bgColour;
		const boc = this.bgOutline === 'tag' ? GetProperty(a, 'color') : this.bgOutline;
		t.a = a;
		t.title = a.title;
		if (t.colour !== colour || t.textFont !== font || t.bgColour !== bc || t.bgOutline !== boc) t.SetFont(font, colour, bc, boc);
	}

	Weight(tl: any[]) {
		const ll = tl.length;
		const weights: any[] = [];
		const wfrom = this.weightFrom ? this.weightFrom.split(/[, ]/) : [null];
		const wl = wfrom.length;
		for (let i = 0; i < ll; ++i) {
			weights[i] = [];
			for (let s = 0; s < wl; ++s) {
				const w = FindWeight(tl[i].a, wfrom[s], this.textHeight);
				if (!this.max_weight[s] || w > this.max_weight[s]) this.max_weight[s] = w;
				if (!this.min_weight[s] || w < this.min_weight[s]) this.min_weight[s] = w;
				weights[i][s] = w;
			}
		}
		let valid = false;
		for (let s = 0; s < wl; ++s) if (this.max_weight[s] > this.min_weight[s]) valid = true;
		if (valid) for (let i = 0; i < ll; ++i) tl[i].SetWeight(weights[i]);
	}

	Load() {
		const tl = this.GetTags();
		let taglist: any[] = [];
		const tagmap: number[] = [];
		const pfuncs: any = {
			sphere: PointsOnSphere,
			vcylinder: PointsOnCylinderV,
			hcylinder: PointsOnCylinderH,
			vring: PointsOnRingV,
			hring: PointsOnRingH,
		};

		if (tl.length) {
			tagmap.length = tl.length;
			for (let i = 0; i < tl.length; ++i) tagmap[i] = i;
			this.shuffleTags && Shuffle(tagmap);
			const rx = 100 * this.radiusX;
			const ry = 100 * this.radiusY;
			const rz = 100 * this.radiusZ;
			this.max_radius = max(rx, max(ry, rz));
			for (let i = 0; i < tl.length; ++i) {
				const t = this.CreateTag(tl[tagmap[i]]);
				if (t) taglist.push(t);
			}
			this.weight && this.Weight(taglist);

			if (this.shapeArgs) {
				this.shapeArgs[0] = taglist.length;
			} else {
				const shapeArgs = this.shape.toString().split(/[(),]/);
				const shape = shapeArgs.shift();
				if (typeof (window as any)[shape] === 'function') this.shape = (window as any)[shape];
				else this.shape = pfuncs[shape] || pfuncs.sphere;
				this.shapeArgs = [taglist.length, rx, ry, rz].concat(shapeArgs);
			}
			const vl = this.shape.apply(this, this.shapeArgs);
			this.listLength = taglist.length;
			for (let i = 0; i < taglist.length; ++i) taglist[i].position = new Vector(vl[i][0], vl[i][1], vl[i][2]);
		}
		if (this.noTagsMessage && !taglist.length) {
			const iMode = this.imageMode && this.imageMode !== 'both' ? this.imageMode + ' ' : '';
			taglist = this.Message('No ' + iMode + 'tags');
		}
		this.taglist = taglist;
	}

	Update() {
		const tl = this.GetTags();
		const newlist: any[] = [];
		const taglist: any[] = this.taglist;
		const added: number[] = [];
		const removed: number[] = [];
		if (!this.shapeArgs) return this.Load();

		if (tl.length) {
			const nl = (this.listLength = tl.length);
			const ol = taglist.length;
			for (let i = 0; i < ol; ++i) {
				newlist.push(taglist[i]);
				removed.push(i);
			}
			for (let i = 0; i < nl; ++i) {
				let found = 0;
				for (let j = 0; j < ol; ++j) {
					if (taglist[j].EqualTo(tl[i])) {
						this.UpdateTag(newlist[j], tl[i]);
						found = 1;
						removed[j] = -1;
					}
				}
				if (!found) added.push(i);
			}
			for (let i = 0, j = 0; i < ol; ++i) {
				if (removed[j] === -1) removed.splice(j, 1);
				else ++j;
			}
			if (removed.length) {
				Shuffle(removed);
				while (removed.length && added.length) {
					const i = removed.shift()!;
					const j = added.shift()!;
					newlist[i] = this.CreateTag(tl[j]);
				}
				removed.sort((a, b) => a - b);
				while (removed.length) newlist.splice(removed.pop()!, 1);
			}
			let j = newlist.length / (added.length + 1);
			let i = 0;
			while (added.length) {
				newlist.splice(ceil(++i * j), 0, this.CreateTag(tl[added.shift()!]));
			}
			this.shapeArgs[0] = newlist.length;
			const vl = this.shape.apply(this, this.shapeArgs);
			for (let k = 0; k < newlist.length; ++k) newlist[k].position = new Vector(vl[k][0], vl[k][1], vl[k][2]);
			this.weight && this.Weight(newlist);
		}
		this.taglist = newlist;
	}

	SetShadow(c: CanvasRenderingContext2D) {
		c.shadowBlur = this.shadowBlur;
		c.shadowOffsetX = this.shadowOffset[0];
		c.shadowOffsetY = this.shadowOffset[1];
	}

	LoadAudio() {
		if (!audio && !SetupAudio()) return;
		if (audio === 'off' || !audio) return;
		this.audio = doc.createElement('audio');
		this.audio.src = this.activeAudio;
		this.track = audio.createMediaElementSource(this.audio);
		this.gain = audio.createGain();
		this.track.connect(this.gain);
		this.gain.connect(audio.destination);
		this.hasAudio = 1;
		audioClick = function () {
			audio && audio !== 'off' && (audio as any).resume();
			audioClick && doc.removeEventListener('click', audioClick);
		};
		doc.addEventListener('click', audioClick);
	}

	ShowAudioIcon() {
		const s = this.audioIconSize;
		const cv = this.canvas;
		const c = this.ctxt;
		const x = cv.width - s - 3;
		const y = cv.height - s - 3;
		const t = this.audioIconThickness;
		const c1 = '#000';
		const c2 = '#fff';
		const d = this.audioIconDark;
		let muted = this.audioOff;
		const sus = 'suspended';
		if (!audio || audio === 'off') return;
		if (!muted) muted = ((audio as any).state === sus);
		if (this.audioIcon && this.hasAudio) {
			AudioIcon(muted, c, s, x, y, t + 1, d ? c2 : c1);
			AudioIcon(muted, c, s, x, y, t, d ? c1 : c2);
		}
	}

	CheckAudioIcon() {
		const s = this.audioIconSize;
		const cv = this.canvas;
		const t = this.audioIconThickness / 2;
		const x = cv.width - s - 3 - t;
		const y = cv.height - s - 3 - t;
		if (this.audioIcon && this.mx >= x && this.my >= y) return true;
		return false;
	}

	ToggleAudio() {
		const on = this.audioOff || (audio && audio !== 'off' && (audio as any).state === 'suspended');
		on || (this.currentAudio && this.currentAudio.StopAudio());
		this.audioOff = !on;
	}

	Draw(t?: number) {
		if (this.paused) return;
		const cv = this.canvas;
		const cw = cv.width;
		const ch = cv.height;
		let max_sc = 0;
		const now = t ?? TimeNow();
		const tdelta = ((now - this.time) * TagCanvas.interval) / 1000;
		const x = cw / 2 + this.offsetX;
		const y = ch / 2 + this.offsetY;
		const c = this.ctxt;
		let active: any;
		let a: any;
		let aindex = -1;
		let tl: any[] = this.taglist;
		const l = tl.length;
		const last = this.active && this.active.tag;
		let cursor = '';
		const frontsel = this.frontSelect;
		let centreDrawn = this.centreFunc === Nop;
		this.time = now;
		if (this.frozen && this.drawn) return this.Animate(cw, ch, tdelta);
		const fixed = this.AnimateFixed();
		c.setTransform(1, 0, 0, 1, 0, 0);
		for (let i = 0; i < l; ++i) tl[i].Calc(this.transform, this.fixedAlpha);
		tl = SortList(tl, (a, b) => b.z - a.z);

		if (fixed && this.fixedAnim.active) {
			active = this.fixedAnim.tag.UpdateActive(c, x, y);
		} else {
			this.active = null;
			if (this.CheckAudioIcon()) {
				cursor = 'pointer';
			} else {
				for (let i = 0; i < l; ++i) {
					a = this.mx >= 0 && this.my >= 0 && this.taglist[i].CheckActive(c, x, y);
					if (a && a.sc > max_sc && (!frontsel || a.z <= 0)) {
						active = a;
						aindex = i;
						active.tag = this.taglist[i];
						max_sc = a.sc;
					}
				}
				this.active = active;
			}
		}

		this.txtOpt || (this.shadow && this.SetShadow(c));
		c.clearRect(0, 0, cw, ch);
		for (let i = 0; i < l; ++i) {
			if (!centreDrawn && tl[i].z <= 0) {
				try {
					this.centreFunc(c, cw, ch, x, y);
				} catch (e) {
					alert(e);
					this.centreFunc = Nop;
				}
				centreDrawn = true;
			}
			if (!(active && active.tag === tl[i] && active.PreDraw(c, tl[i], x, y))) tl[i].Draw(c, x, y);
			active && active.tag === tl[i] && active.PostDraw(c);
		}

		if (this.freezeActive && active) {
			this.Freeze();
		} else {
			this.UnFreeze();
			this.drawn = l === this.listLength;
		}

		if (this.fixedCallback) {
			this.fixedCallback(this, this.fixedCallbackTag);
			this.fixedCallback = null;
		}

		fixed || this.Animate(cw, ch, tdelta);

		if (active) {
			active.LastDraw(c);
			if (active.tag !== last) {
				this.currentAudio && this.currentAudio !== active.tag && this.currentAudio.StopAudio();
				if (active.tag.PlayAudio()) this.currentAudio = active.tag;
			}
			cursor = this.activeCursor;
		}

		cv.style.cursor = cursor;
		this.Tooltip(active, this.taglist[aindex]);
		this.audioIcon && this.ShowAudioIcon();
	}

	TooltipNone() {}

	TooltipNative(active: any, tag: any) {
		if (active) this.canvas.title = tag && tag.title ? tag.title : '';
		else this.canvas.title = this.ctitle;
	}

	SetTTDiv(title: string, tag?: any) {
		const tc: any = this;
		const s = tc.ttdiv.style;
		if (title !== tc.ttdiv.innerHTML) s.display = 'none';
		tc.ttdiv.innerHTML = title;
		tag && (tag.title = tc.ttdiv.innerHTML);
		if (s.display === 'none' && !tc.tttimer) {
			tc.tttimer = setTimeout(function () {
				const p = AbsPos(tc.canvas.id);
				s.display = 'block';
				s.left = p.x + tc.mx + 'px';
				s.top = p.y + tc.my + 24 + 'px';
				tc.tttimer = null;
			}, tc.tooltipDelay);
		}
	}

	TooltipDiv(active: any, tag: any) {
		if (active && tag && tag.title) {
			this.SetTTDiv(tag.title, tag);
		} else if (!active && this.mx !== -1 && this.my !== -1 && this.ctitle.length) {
			this.SetTTDiv(this.ctitle);
		} else {
			this.ttdiv.style.display = 'none';
		}
	}

	Tooltip: any = this.TooltipNone;

	Transform(tc: any, p: number, y: number) {
		if (p || y) {
			const sp = sin(p);
			const cp = cos(p);
			const sy = sin(y);
			const cy = cos(y);
			const ym = new Matrix([cy, 0, sy, 0, 1, 0, -sy, 0, cy]);
			const pm = new Matrix([1, 0, 0, 0, cp, -sp, 0, sp, cp]);
			tc.transform = tc.transform.mul(ym.mul(pm));
		}
	}

	AnimateFixed() {
		if (this.fadeIn) {
			const t1 = TimeNow() - this.startTime;
			if (t1 >= this.fadeIn) {
				this.fadeIn = 0;
				this.fixedAlpha = 1;
			} else {
				this.fixedAlpha = t1 / this.fadeIn;
			}
		}
		if (this.fixedAnim) {
			if (!this.fixedAnim.transform) this.fixedAnim.transform = this.transform;
			const fa = this.fixedAnim;
			const t1 = TimeNow() - fa.t0;
			let angle = fa.angle;
			const d = this.animTiming(fa.t, t1);
			this.transform = fa.transform;
			if (t1 >= fa.t) {
				this.fixedCallbackTag = fa.tag;
				this.fixedCallback = fa.cb;
				this.fixedAnim = this.yaw = this.pitch = 0;
			} else {
				angle *= d;
			}
			const m = Matrix.Rotation(angle, fa.axis);
			this.transform = this.transform.mul(m);
			return this.fixedAnim !== 0;
		}
		return false;
	}

	AnimatePosition(w: number, h: number, t: number) {
		const tc: any = this;
		const x = tc.mx;
		const y = tc.my;
		if (!tc.frozen && x >= 0 && y >= 0 && x < w && y < h) {
			const s = tc.maxSpeed;
			const r = tc.reverse ? -1 : 1;
			tc.lx || (tc.yaw = ((x * 2 * s) / w - s) * r * t);
			tc.ly || (tc.pitch = ((y * 2 * s) / h - s) * -r * t);
			tc.initial = null;
		} else if (!tc.initial) {
			if (tc.frozen && !tc.freezeDecel) tc.yaw = tc.pitch = 0;
			else tc.Decel(tc);
		}
		this.Transform(tc, tc.pitch, tc.yaw);
	}

	AnimateDrag(w: number, _h: number, t: number) {
		const tc: any = this;
		const rs = (100 * t * tc.maxSpeed) / tc.max_radius / tc.zoom;
		if (tc.dx || tc.dy) {
			tc.lx || (tc.yaw = (tc.dx * rs) / tc.stretchX);
			tc.ly || (tc.pitch = (tc.dy * -rs) / tc.stretchY);
			tc.dx = tc.dy = 0;
			tc.initial = null;
		} else if (!tc.initial) {
			tc.Decel(tc);
		}
		this.Transform(tc, tc.pitch, tc.yaw);
	}

	Freeze() {
		if (!this.frozen) {
			this.preFreeze = [this.yaw, this.pitch];
			this.frozen = 1;
			this.drawn = 0;
		}
	}

	UnFreeze() {
		if (this.frozen) {
			this.yaw = this.preFreeze[0];
			this.pitch = this.preFreeze[1];
			this.frozen = 0;
		}
	}

	Decel(tc: any) {
		const s = tc.minSpeed;
		const ay = abs(tc.yaw);
		const ap = abs(tc.pitch);
		if (!tc.lx && ay > s) tc.yaw = ay > tc.z0 ? tc.yaw * tc.decel : 0;
		if (!tc.ly && ap > s) tc.pitch = ap > tc.z0 ? tc.pitch * tc.decel : 0;
	}

	Zoom(r: number) {
		this.z2 = this.z1 * (1 / r);
		this.drawn = 0;
	}

	Clicked(e?: any) {
		if (this.CheckAudioIcon()) {
			this.ToggleAudio();
			return;
		}
		const a = this.active;
		try {
			if (a && a.tag)
				if (this.clickToFront === false || this.clickToFront === null) a.tag.Clicked(e);
				else this.TagToFront(a.tag, this.clickToFront, function () { a.tag.Clicked(e); }, true);
		} catch {}
	}

	Wheel(i: any) {
		const z = this.zoom + this.zoomStep * (i ? 1 : -1);
		this.zoom = min(this.zoomMax, max(this.zoomMin, z));
		this.Zoom(this.zoom);
	}

	BeginDrag(e: any) {
		this.down = EventXY(e, this.canvas);
		e.cancelBubble = true;
		e.returnValue = false;
		e.preventDefault && e.preventDefault();
	}

	Drag(e: any, p: any) {
		if (this.dragControl && this.down) {
			const t2 = this.dragThreshold * this.dragThreshold;
			const dx = p.x - this.down.x;
			const dy = p.y - this.down.y;
			if (this.dragging || dx * dx + dy * dy > t2) {
				this.dx = dx;
				this.dy = dy;
				this.dragging = 1;
				this.down = p;
			}
		}
		return this.dragging;
	}

	EndDrag() {
		const res = this.dragging;
		this.dragging = this.down = null;
		return res;
	}

	BeginPinch(e: any) {
		this.pinched = [PinchDistance(e), this.zoom];
		e.preventDefault && e.preventDefault();
	}

	Pinch(e: any) {
		const p = this.pinched;
		if (!p) return;
		const d = PinchDistance(e);
		const z = (p[1] * d) / p[0];
		this.zoom = min(this.zoomMax, max(this.zoomMin, z));
		this.Zoom(this.zoom);
	}

	EndPinch(_e?: any) {
		this.pinched = null;
	}

	Pause() {
		this.paused = true;
	}

	Resume() {
		this.paused = false;
	}

	SetSpeed(i: [number, number]) {
		this.initial = i;
		this.yaw = i[0] * this.maxSpeed;
		this.pitch = i[1] * this.maxSpeed;
	}

	FindTag(t: any) {
		if (!Defined(t)) return null;
		Defined(t.index) && (t = t.index);
		if (!IsObject(t)) return this.taglist[t];
		let srch: any;
		let tgt: any;
		if (Defined((t as any).id)) {
			srch = 'id';
			tgt = (t as any).id;
		} else if (Defined((t as any).text)) {
			srch = 'innerText';
			tgt = (t as any).text;
		}
		for (let i = 0; i < this.taglist.length; ++i) if (this.taglist[i].a[srch] === tgt) return this.taglist[i];
	}

	RotateTag(tag: any, lt: number, lg: number, time: number, callback?: any, active?: any) {
		const t = tag.Calc(this.transform, 1);
		const v1 = new Vector(t.x, t.y, t.z);
		const v2 = MakeVector(lg, lt);
		const angle = v1.angle(v2);
		const u = v1.cross(v2).unit();
		if (angle === 0) {
			this.fixedCallbackTag = tag;
			this.fixedCallback = callback;
		} else {
			this.fixedAnim = {
				angle: -angle,
				axis: u,
				t: time,
				t0: TimeNow(),
				cb: callback,
				tag: tag,
				active: active,
			};
		}
	}

	TagToFront(tag: any, time: number, callback?: any, active?: any) {
		this.RotateTag(tag, 0, 0, time, callback, active);
	}

	Volume(vol: number) {
		this.audioVolume = vol * 1;
	}

	static Start(id: string, l?: string, o?: TagCanvasOptions) {
		TagCanvas.Delete(id);
		TagCanvas.tc[id] = new TagCanvas(id, l, o);
	}

	static Linear(t: number, t0: number) {
		return t0 / t;
	}
	static Smooth(t: number, t0: number) {
		return 0.5 - cos((t0 * Math.PI) / t) / 2;
	}

	static Pause(id: string) {
		TagCanvas.tc[id] && TagCanvas.tc[id].Pause();
	}
	static Resume(id: string) {
		TagCanvas.tc[id] && TagCanvas.tc[id].Resume();
	}
	static Reload(id: string) {
		TagCanvas.tc[id] && TagCanvas.tc[id].Load();
	}
	static UpdateCanvas(id: string) {
		TagCanvas.tc[id] && TagCanvas.tc[id].Update();
	}

	static SetSpeedStatic(id: string, speed: any) {
		if (IsObject(speed) && TagCanvas.tc[id] && !Number.isNaN(speed[0]) && !Number.isNaN(speed[1])) {
			TagCanvas.tc[id].SetSpeed(speed);
			return true;
		}
		return false;
	}

	static TagToFrontStatic(id: string, options: any) {
		if (!IsObject(options)) return false;
		options.lat = options.lng = 0;
		return TagCanvas.RotateTagStatic(id, options);
	}

	static RotateTagStatic(id: string, options: any) {
		if (IsObject(options) && TagCanvas.tc[id]) {
			if (Number.isNaN(options.time)) options.time = 500;
			const tt = TagCanvas.tc[id].FindTag(options);
			if (tt) {
				TagCanvas.tc[id].RotateTag(tt, options.lat, options.lng, options.time, options.callback, options.active);
				return true;
			}
		}
		return false;
	}

	static Delete(id: string) {
		if (handlers[id]) {
			const c = doc.getElementById(id);
			if (c) {
				for (let i = 0; i < handlers[id].length; ++i) RemoveHandler(handlers[id][i][0], handlers[id][i][1], c);
			}
		}
		delete handlers[id];
		delete TagCanvas.tc[id];
	}
}

function PinchDistance(e: any) {
	const t1 = e.targetTouches[0];
	const t2 = e.targetTouches[1];
	return sqrt(pow(t2.pageX - t1.pageX, 2) + pow(t2.pageY - t1.pageY, 2));
}
