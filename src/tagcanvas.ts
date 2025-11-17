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
    centreFunc?: (c: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number) => void;
    splitWidth?: number;
    animTiming?: string | ((t: number) => number);
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
type PositionX = 'top' | 'bottom';
type PositionY = 'left' | 'right';
type Position = PositionX | PositionY;

// keep many helpers and classes in this file. Use `any` where type is complex.
const abs = Math.abs, sin = Math.sin, cos = Math.cos, max = Math.max,
    min = Math.min, ceil = Math.ceil, sqrt = Math.sqrt, pow = Math.pow;

const hexlookup1: Record<string, string> = {
    0: "0,", 1: "17,", 2: "34,", 3: "51,", 4: "68,", 5: "85,",
    6: "102,", 7: "119,", 8: "136,", 9: "153,", a: "170,", A: "170,",
    b: "187,", B: "187,", c: "204,", C: "204,", d: "221,", D: "221,",
    e: "238,", E: "238,", f: "255,", F: "255,"
};
const hexlookup2: Record<string, string> = (() => {
    const lookup: Record<string, string> = {};
    let i: number, j: any;
    for (i = 0; i < 256; ++i) {
        j = i.toString(16);
        if (i < 16) {
            j = '0' + j;
        }
        lookup[j] = lookup[j.toUpperCase()] = i.toString() + ',';
    }

    return lookup;
})();
const hexlookup3: Record<string, string> = {};

function Defined<T>(d: T): d is Exclude<T, undefined> {
    return typeof d != 'undefined';
}
function IsObject<T>(o: T): o is Exclude<T, null> & object {
    return typeof o == 'object' && o != null;
}

function Clamp(v: number, mn: number, mx: number) {
    return isNaN(v) ? mx : min(mx, max(mn, v));
}
function Nop() {
    return false;
}
function TimeNow() {
    return Date.now();
}

function SortList<T>(l: T[], f: (a: T, b: T) => number): T[] {
    return l.toSorted(f);
}
function Shuffle<T>(a: T[]): void {
    let idx = a.length - 1;
    let t: T;
    let p: number;

    while (idx > 0) {
        p = ~~(Math.random() * idx);
        t = a[idx];
        a[idx] = a[p];
        a[p] = t;
        --idx;
    }
}

function SetupAudio(): AudioContext | undefined {
    // @ts-expect-error WebkitAudioContext may not be defined
    const ac = AudioContext || window.webkitAudioContext;
    if (!ac) return undefined;

    try {
        return new ac();
    } catch (e) {
        return undefined;
    }
}
function AudioIcon(mute: any, c: CanvasRenderingContext2D, size: number, offsetx: number, offsety: number, stroke: number, colour: string) {
    const x = offsetx, y = offsety, s = size * 0.01, w = 80 * s, h = 100 * s, d = 40 * s, e = 30 * s;
    const f = e / 2;
    const x2 = x + w, x1 = x2 - d;
    const y3 = y + h, y2 = y3 - e, y1 = y + e, y4 = y + h / 2;
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

/** 3D ベクトルクラス */
class Vector {
    public x: number;
    public y: number;
    public z: number;

    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /** ベクトルの長さ */
    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /** 内積 */
    public dot(v: Vector): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /** 外積 */
    public cross(v: Vector): Vector {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        return new Vector(x, y, z);
    }

    /** 2つのベクトルのなす角 (rad) */
    public angle(v: Vector): number {
        const dot = this.dot(v);
        if (dot == 0) return Math.PI / 2;

        let ac = dot / (this.length() * v.length());
        if (ac >= 1) {
            return 0;
        }
        if (ac <= -1) {
            return Math.PI;
        }
        return Math.acos(ac);
    }

    /** 単位ベクトル */
    public unit(): Vector {
        const l = this.length();
        return new Vector(this.x / l, this.y / l, this.z / l);
    }
}

/** 3x3 行列クラス */
class Matrix {
    public components: [
        ThreeDCoord,
        ThreeDCoord,
        ThreeDCoord,
    ];

    constructor(a: number[]) {
        this.components = [
            [a[0], a[1], a[2]],
            [a[3], a[4], a[5]],
            [a[6], a[7], a[8]],
        ];
    }

    /** 単位行列 */
    static Identity() {
        return new Matrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }

    /** 回転した行列 */
    static Rotation(angle: number, u: Vector) {
        const sina = sin(angle);
        const cosa = cos(angle);
        const mcos = 1 - cosa;

        return new Matrix([
            cosa + pow(u.x, 2) * mcos, u.x * u.y * mcos - u.z * sina, u.x * u.z * mcos + u.y * sina,
            u.y * u.x * mcos + u.z * sina, cosa + pow(u.y, 2) * mcos, u.y * u.z * mcos - u.x * sina,
            u.z * u.x * mcos - u.y * sina, u.z * u.y * mcos + u.x * sina, cosa + pow(u.z, 2) * mcos
        ]);
    }

    /** 行列の掛け算（行列同士、またはスカラー倍） */
    public mul(m: Matrix | number): Matrix {
        const a: number[] = [];

        for (let i = 0; i < 3; ++i) {
            for (let j = 0; j < 3; ++j) {
                if (typeof m === 'number') {
                    a.push(this.components[i][j] * m);
                } else if (m instanceof Matrix) {
                    a.push(this.components[i][0] * m.components[0][j] + this.components[i][1] * m.components[1][j] + this.components[i][2] * m.components[2][j]);
                }
            }
        }

        return new Matrix(a);
    }

    /** ベクトルの変換 */
    public xform(p: Vector) {
        const a: { x: number; y: number; z: number; } = { x: 0, y: 0, z: 0 };

        const x = p.x, y = p.y, z = p.z;
        a.x = x * this.components[0][0] + y * this.components[1][0] + z * this.components[2][0];
        a.y = x * this.components[0][1] + y * this.components[1][1] + z * this.components[2][1];
        a.z = x * this.components[0][2] + y * this.components[1][2] + z * this.components[2][2];

        return a;
    }
}

/** 球面上の点を均等に配置する */
function PointsOnSphere(n: number, xr: number, yr: number, zr: number, magic?: string): ThreeDCoord[] {
    const pts: ThreeDCoord[] = [];
    const off = 2 / n;
    const inc = Math.PI * (3 - sqrt(5) + (magic != null && parseFloat(magic) ? parseFloat(magic) : 0));

    for (let i = 0; i < n; ++i) {
        let y = i * off - 1 + (off / 2);
        let r = sqrt(1 - y * y);
        let phi = i * inc;
        pts.push([cos(phi) * r * xr, y * yr, sin(phi) * r * zr]);
    }
    return pts;
}

/** 円柱面上の点を均等に配置する */
function Cylinder(n: number, o: number, xr: number, yr: number, zr: number, magic?: string): ThreeDCoord[] {
    const pts: ThreeDCoord[] = [];
    const off = 2 / n;
    const inc = Math.PI * (3 - sqrt(5) + (magic != null && parseFloat(magic) ? parseFloat(magic) : 0));

    for (let i = 0; i < n; ++i) {
        let j = i * off - 1 + (off / 2);
        let phi = i * inc;
        let k = cos(phi);
        let l = sin(phi);
        pts.push(o ? [j * xr, k * yr, l * zr] : [k * xr, j * yr, l * zr]);
    }
    return pts;
}

/** 円環上の点を均等に配置する */
function Ring(o: number, n: number, xr: number, yr: number, zr: number, j: number) {
    const pts: ThreeDCoord[] = [];
    const inc = Math.PI * 2 / n;

    for (let i = 0; i < n; ++i) {
        let phi = i * inc;
        let k = cos(phi);
        let l = sin(phi);
        pts.push(o ? [j * xr, k * yr, l * zr] : [k * xr, j * yr, l * zr]);
    }
    return pts;
}

function PointsOnCylinderV(n: number, xr: number, yr: number, zr: number, magic?: string) { return Cylinder(n, 0, xr, yr, zr, magic); }
function PointsOnCylinderH(n: number, xr: number, yr: number, zr: number, magic?: string) { return Cylinder(n, 1, xr, yr, zr, magic); }
function PointsOnRingV(n: number, xr: number, yr: number, zr: number, offset?: any) { offset = isNaN(offset) ? 0 : offset * 1; return Ring(0, n, xr, yr, zr, offset); }
function PointsOnRingH(n: number, xr: number, yr: number, zr: number, offset?: any) { offset = isNaN(offset) ? 0 : offset * 1; return Ring(1, n, xr, yr, zr, offset); }

/** 中央に画像を描画する関数を設定する */
function CentreImage(t: TagCanvasOptions) {
    const i = new Image();
    i.onload = function () {
        const dx = i.width / 2;
        const dy = i.height / 2;
        t.centreFunc = function (c: CanvasRenderingContext2D, w: number, h: number, cx: number, cy: number) {
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.globalAlpha = 1;
            c.drawImage(i, cx - dx, cy - dy);
        };
    };
    i.src = t.centreImage!;
}

/** 色のアルファ値を設定する */
function SetAlpha(c: string, a: number): string {
    let d = c;
    let p1: number;
    let p2: number;
    let ae = (a * 1).toPrecision(3) + ')';

    if (c[0] === '#') {
        if (!hexlookup3[c]) {
            if (c.length === 4) {
                hexlookup3[c] = 'rgba(' + hexlookup1[c[1]] + hexlookup1[c[2]] + hexlookup1[c[3]];
            } else {
                hexlookup3[c] = 'rgba(' + hexlookup2[c.substring(1, 3)] + hexlookup2[c.substring(3, 5)] + hexlookup2[c.substring(5, 7)]; d = hexlookup3[c] + ae;
            }
        }
    } else if (c.substring(0, 4) === 'rgb(' || c.substring(0, 4) === 'hsl(') {
        d = (c.replace('(', 'a(').replace(')', ',' + ae));
    } else if (c.substring(0, 5) === 'rgba(' || c.substring(0, 5) === 'hsla(') {
        p1 = c.lastIndexOf(',') + 1;
        p2 = c.indexOf(')');
        a *= parseFloat(c.substring(p1, p2));
        d = c.substring(0, p1) + a.toPrecision(3) + ')';
    }

    return d;
}

/** 新しいキャンバス要素を作成する */
function NewCanvas(w: number, h: number): HTMLCanvasElement | null {
    if ((window as any).G_vmlCanvasManager) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

/** shadowColor と globalAlpha の組み合わせが正しく動作しないかを調べる */
function ShadowAlphaBroken(): boolean {
    const cv = NewCanvas(3, 3);

    let c: CanvasRenderingContext2D;
    let i: ImageData;

    if (cv == null) return false;
    c = cv.getContext('2d')!;
    c.strokeStyle = '#000';
    c.shadowColor = '#fff';
    c.shadowBlur = 3;
    c.globalAlpha = 0;
    c.strokeRect(2, 2, 2, 2);
    c.globalAlpha = 1;
    i = c.getImageData(2, 2, 1, 1);
    return (i.data[0] > 0);
}

/** グラデーションを設定する */
function SetGradient(c: CanvasRenderingContext2D, l: number, o: number, g: string[]) {
    const gd = c.createLinearGradient(0, 0, l, 0);
    for (const i in g) {
        gd.addColorStop(1 - (+i), g[i]);
        c.fillStyle = gd;
        c.fillRect(0, o, l, 1);
    }
}

/** グラデーションから色を取得する */
function FindGradientColour(tc: any, p: number, r?: number) {
    const l = 1024;
    let gl = tc.weightGradient;
    let cv: any;
    let c: any;
    let i: any;
    let d: any;
    let h = 1;

    if (tc.gCanvas) {
        c = tc.gCanvas.getContext('2d');
        h = tc.gCanvas.height;
    } else {
        if (IsObject(gl[0])) {
            h = gl.length;
        } else {
            gl = [gl];
        }

        tc.gCanvas = cv = NewCanvas(l, h);
        if (!cv) return null;
        c = cv.getContext('2d')!;

        for (i = 0; i < h; ++i) {
            SetGradient(c, l, i, gl[i]);
        }
    }

    r = max(min(r || 0, h - 1), 0);
    d = c.getImageData(~~((l - 1) * p), r, 1, 1).data;

    return 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + (d[3] / 255) + ')';
}

/** テキストを描画する */
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
    widths?: any,
    align?: string,
) {
    const xo = padx + (shadowBlur || 0) + (shadowOffsets.length && shadowOffsets[0] < 0 ? abs(shadowOffsets[0]) : 0);
    const yo = pady + (shadowBlur || 0) + (shadowOffsets.length && shadowOffsets[1] < 0 ? abs(shadowOffsets[1]) : 0);
    let i, xc;

    ctxt.font = font;
    ctxt.textBaseline = 'top';
    ctxt.fillStyle = colour;
    shadowColour && (ctxt.shadowColor = shadowColour);
    shadowBlur && (ctxt.shadowBlur = shadowBlur);
    shadowOffsets.length && (ctxt.shadowOffsetX = shadowOffsets[0], ctxt.shadowOffsetY = shadowOffsets[1]);

    let y = yo;

    for (i = 0; i < strings.length; ++i) {
        xc = 0;
        if (widths) {
            if ('right' == align) {
                xc = maxWidth - widths[i];
            } else if ('centre' == align) {
                xc = (maxWidth - widths[i]) / 2;
            }
        }

        ctxt.fillText(strings[i], xo + xc, y);
        y += parseInt(font);
    }
}

/** 角丸長方形を描画する */
function RRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, s?: boolean) {
    if (r) {
        c.beginPath();
        c.moveTo(x, y + h - r);
        c.arcTo(x, y, x + r, y, r);
        c.arcTo(x + w, y, x + w, y + r, r);
        c.arcTo(x + w, y + h, x + w - r, y + h, r);
        c.arcTo(x, y + h, x, y + h - r, r);
        c.closePath();
        c[s ? 'stroke' : 'fill']();
    } else {
        c[s ? 'strokeRect' : 'fillRect'](x, y, w, h);
    }
}

/** テキストキャンバスクラス */
class TextCanvas {
    strings: string[];
    font: string;
    width: number;
    height: number;
    maxWidth: number;
    stringWidths: any;
    align: any;
    valign: any;
    scale: number;
    image?: HTMLImageElement;
    iwidth?: number;
    iheight?: number;
    ipos?: Position;
    ipad?: number;
    iscale?: any;
    ialign?: any;
    ivalign?: any;

    constructor(strings: string[], font: string, w: number, h: number, maxWidth: number, stringWidths: any, align: any, valign: any, scale: number) {
        this.strings = strings;
        this.font = font;
        this.width = w;
        this.height = h;
        this.maxWidth = maxWidth;
        this.stringWidths = stringWidths;
        this.align = align;
        this.valign = valign;
        this.scale = scale;
    }

    public SetImage(image: HTMLImageElement, w: number, h: number, position: any, padding: number, align: any, valign: any, scale: number) {
        this.image = image;
        this.iwidth = w * this.scale;
        this.iheight = h * this.scale;
        this.ipos = position;
        this.ipad = padding * this.scale;
        this.iscale = scale;
        this.ialign = align;
        this.ivalign = valign;
    }

    public Align(size: number, space: number, a: Position) {
        let pos = 0;
        if (a == 'right' || a == 'bottom') {
            pos = space - size;
        } else if (a != 'left' && a != 'top') {
            pos = (space - size) / 2;
        }
        return pos;
    }

    public Create(colour: any, bgColour: any, bgOutline: any, bgOutlineThickness: any, shadowColour: any, shadowBlur: any, shadowOffsets: any, _padding: any, radius: any) {
        if (
            this.image == null ||
            this.ipad == null ||
            this.iwidth == null ||
            this.iheight == null ||
            this.ipos == null ||
            this.iscale == null ||
            this.ialign == null ||
            this.ivalign == null
        ) {
            throw new Error('Image properties not set');
        }

        const sox = abs(shadowOffsets[0]);
        const soy = abs(shadowOffsets[1]);
        const padding = max(_padding, sox + shadowBlur, soy + shadowBlur);

        let x1 = 2 * (padding + bgOutlineThickness);
        let y1 = 2 * (padding + bgOutlineThickness);

        let cw = this.width + x1;
        let ch = this.height + y1;

        let offx = padding + bgOutlineThickness;
        let offy = padding + bgOutlineThickness;

        let ix: number = 0;
        let iy: number = 0;
        let iw: number = 0;
        let ih: number = 0;
        let rr: number;
        let shadowcv: HTMLCanvasElement | null = null;
        let shadowc: CanvasRenderingContext2D | null = null;

        if (this.image) {
            ix = iy = padding + bgOutlineThickness;
            iw = this.iwidth;
            ih = this.iheight;

            if (this.ipos == 'top' || this.ipos == 'bottom') {
                if (iw < this.width) {
                    ix += this.Align(iw, this.width, this.ialign);
                } else {
                    offx += this.Align(this.width, iw, this.align);
                }
                if (this.ipos == 'top') {
                    offy += ih + this.ipad;
                } else {
                    iy += this.height + this.ipad;
                }

                cw = max(cw, iw + x1);
                ch += ih + this.ipad;
            } else {
                if (ih < this.height) {
                    iy += this.Align(ih, this.height, this.ivalign);
                } else {
                    offy += this.Align(this.height, ih, this.valign);
                }
                if (this.ipos == 'right') {
                    ix += this.width + this.ipad;
                } else {
                    offx += iw + this.ipad;
                }
                cw += iw + this.ipad;
                ch = max(ch, ih + y1);
            }
        }

        const cv = NewCanvas(cw, ch);
        if (!cv) return null;

        x1 = y1 = bgOutlineThickness / 2;
        let x2 = cw - bgOutlineThickness;
        let y2 = ch - bgOutlineThickness;
        rr = min(radius, x2 / 2, y2 / 2);
        let c = cv.getContext('2d')!;

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

        if (this.image) c.drawImage(this.image, ix, iy, iw, ih);

        if (shadowc) {
            c = shadowc;
            shadowColour && (c.shadowColor = shadowColour);
            shadowBlur && (c.shadowBlur = shadowBlur);
            c.shadowOffsetX = shadowOffsets[0];
            c.shadowOffsetY = shadowOffsets[1];
            c.drawImage(shadowcv!, 0, 0);
        }

        return cv;
    }
}

/** 画像を拡大する */
function ExpandImage(i: HTMLImageElement, w: number, h: number) {
    const cv = NewCanvas(w, h);
    if (!cv) return null;
    const c = cv.getContext('2d')!;
    c.drawImage(i, (w - i.width) / 2, (h - i.height) / 2);
    return cv;
}

/** 画像を縮小する */
function ScaleImage(i: HTMLImageElement, w: number, h: number) {
    const cv = NewCanvas(w, h);
    if (!cv) return null;
    const c = cv.getContext('2d')!;
    c.drawImage(i, 0, 0, w, h);
    return cv;
}

/** 画像に背景を追加する */
function AddBackgroundToImage(i: any, w: number, h: number, scale: number, colour: any, othickness: number, ocolour: any, padding: number, radius: number, ofill?: boolean) {
    const cw = w + ((2 * padding) + othickness) * scale;
    const ch = h + ((2 * padding) + othickness) * scale;
    const cv = NewCanvas(cw, ch);
    if (!cv) return null;

    const scaledOthickness = othickness * scale;
    const scaledRadius = radius * scale;
    let x1 = scaledOthickness / 2;
    let y1 = x1;
    let x2 = cw - scaledOthickness;
    let y2 = ch - scaledOthickness;
    const scaledPadding = (padding * scale) + x1;

    const c = cv.getContext('2d')!;
    const rr = min(scaledRadius, x2 / 2, y2 / 2);

    if (colour) {
        c.fillStyle = colour;
        RRect(c, x1, y1, x2, y2, rr);
    }

    if (scaledOthickness) {
        c.strokeStyle = ocolour;
        c.lineWidth = scaledOthickness;
        RRect(c, x1, y1, x2, y2, rr, true);
    }

    if (ofill) {
        const ocanvas = NewCanvas(cw, ch)!;
        const cc = ocanvas!.getContext('2d')!;
        cc.drawImage(i, scaledPadding, scaledPadding, w, h);
        cc.globalCompositeOperation = 'source-in';
        cc.fillStyle = ocolour;
        cc.fillRect(0, 0, cw, ch);
        cc.globalCompositeOperation = 'destination-over';
        cc.drawImage(cv, 0, 0);
        cc.globalCompositeOperation = 'source-over';
        c.drawImage(ocanvas, 0, 0);
    } else {
        c.drawImage(i, scaledPadding, scaledPadding, i.width, i.height);
    }

    return {
        image: cv,
        width: cw / scale,
        height: ch / scale,
    };
}

/** 画像の角丸処理 */
function RoundImage(i: any, r: any, iw: number, ih: number, s: number) {
    const cv = NewCanvas(iw, ih);
    if (!cv) return null;

    let r1 = parseFloat(r);
    let l = max(iw, ih);

    if (r.indexOf('%') > 0) {
        r1 = l * r1 / 100;
    } else {
        r1 = r1 * s;
    }

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

/** 画像に影を追加する */
function AddShadowToImage(i: any, w: number, h: number, scale: number, sc: any, sb: number, so: number[]) {
    const sw = abs(so[0])
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
    so && (c.shadowOffsetX = so[0] * scale, c.shadowOffsetY = so[1] * scale);
    c.drawImage(i, xo, yo, w, h);

    return {
        image: cv,
        width: cw / scale,
        height: ch / scale,
    };
}

/** テキストの境界ボックスを取得する */
function FindTextBoundingBox(s: string[], f: string, ht: number) {
    const w = Math.round(s.join().length * ht);
    const h = Math.round(ht * 2 * s.length);

    const cv = NewCanvas(w, h);
    if (!cv) return null;

    const c = cv.getContext('2d')!;
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
    TextSet(c, ht + 'px ' + f, '#fff', s, 0, 0, 0, 0, [], 'centre');
    const idata = c.getImageData(0, 0, w, h);
    const w1 = idata.width;
    const h1 = idata.height;
    const ex: {
        min: { x: number; y: number; };
        max: { x: number; y: number; };
    } = {
        min: { x: w1, y: h1 },
        max: { x: -1, y: -1 },
    };

    for (let y = 0; y < h1; ++y) {
        for (let x = 0; x < w1; ++x) {
            const ii = (y * w1 + x) * 4;
            if (idata.data[ii + 1] > 0) {
                if (x < ex.min.x) {
                    ex.min.x = x;
                }
                if (x > ex.max.x) {
                    ex.max.x = x;
                }
                if (y < ex.min.y) {
                    ex.min.y = y;
                }
                if (y > ex.max.y) {
                    ex.max.y = y;
                }
            }
        }
    }
    if (w1 != w) {
        ex.min.x *= (w / w1);
        ex.max.x *= (w / w1);
    }
    if (h1 != h) {
        ex.min.y *= (w / h1);
        ex.max.y *= (w / h1);
    }

    return ex;
}


function FixFont(f: string) {
    return "'" + f.replace(/(\'|\")/g, '').replace(/\s*,\s*/g, "', '") + "'";
}

function AddHandler(h: string, f: EventListener, e: EventTarget | Document = document) {
    e.addEventListener(h, f as EventListener, false);
}
function RemoveHandler(h: string, f: EventListenerOrEventListenerObject, e: EventTarget | Document = document) {
    e.removeEventListener(h, f as EventListener);
}

function AddImage(i: any, o: any, alt: any, t: any, tc: any) {
    if (!o.complete) return AddHandler('load', function () { AddImage(i, o, alt, t, tc); }, o);
    if (!i.complete) return AddHandler('load', function () { AddImage(i, o, alt, t, tc); }, i);
    if (alt && !alt.complete) return AddHandler('load', function () { AddImage(i, o, alt, t, tc); }, alt);

    o.width = o.width;
    o.height = o.height;
    const s = tc.imageScale;
    let mscale: any, ic: any, bc: any, oc: any, iw: any, ih: any;
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

        if (parseFloat(tc.imageRadius)) {
            t.image = t.fimage = i = RoundImage(t.image, tc.imageRadius, iw, ih, mscale);
        }

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
                bc = tc.bgColour == 'tag' ? GetProperty(t.a, 'background-color') : tc.bgColour;
                oc = tc.bgOutline == 'tag' ? GetProperty(t.a, 'color') : (tc.bgOutline || tc.textColour);
                iw = t.fimage.width;
                ih = t.fimage.height;

                if (tc.outlineMethod == 'colour') {
                    ic = AddBackgroundToImage(t.fimage, iw, ih, mscale, bc, tc.bgOutlineThickness, t.outline.colour, tc.padding, tc.bgRadius, true);
                    if (ic) t.oimage = ic.image;
                }

                ic = AddBackgroundToImage(t.fimage, iw, ih, mscale, bc, tc.bgOutlineThickness, oc, tc.padding, tc.bgRadius);

                if (ic) {
                    t.fimage = ic.image;
                    t.w = ic.width;
                    t.h = ic.height;
                }
            }

            if (tc.outlineMethod == 'size') {
                if (tc.outlineIncrease > 0) {
                    t.iw += 2 * tc.outlineIncrease;
                    t.ih += 2 * tc.outlineIncrease;
                    iw = mscale * t.iw;
                    ih = mscale * t.ih;
                    ic = ScaleImage(t.fimage, iw, ih);
                    t.oimage = ic;
                    t.fimage = ExpandImage(t.fimage, t.oimage.width, t.oimage.height);
                } else {
                    iw = mscale * (t.iw + (2 * tc.outlineIncrease));
                    ih = mscale * (t.ih + (2 * tc.outlineIncrease));
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
    const dv = document.defaultView;
    const pc = p.replace(/\-([a-z])/g, function (a: string) { return a.charAt(1).toUpperCase() });
    return (dv && dv.getComputedStyle && dv.getComputedStyle(e, null).getPropertyValue(p)) || (e.currentStyle && e.currentStyle[pc]);
}

function FindWeight(a: any, wFrom: any, tHeight: any) {
    let w = 1;
    let p: any;

    if (wFrom) {
        w = 1 * (a.getAttribute(wFrom) || tHeight);
    } else if (p = GetProperty(a, 'font-size')) {
        w = (p.indexOf('px') > -1 && p.replace('px', '') * 1) || (p.indexOf('pt') > -1 && p.replace('pt', '') * 1.25) || p * 3.3;
    }

    return w;
}

function EventToCanvasId(e: Event): string | null {
    const target = e.target as HTMLElement | null;
    if (target && target.id) {
        return target.id;
    }

    const currentTarget = e.currentTarget as HTMLElement | null;
    if (currentTarget && currentTarget.id) {
        return currentTarget.id;
    }

    return null;
}

function EventXY(e: any, c: any) {
    let xy: { x: number; y: number; } | null = null;
    let p: { x: number; y: number; };
    let xmul = parseInt(GetProperty(c, 'width')) / c.width;
    let ymul = parseInt(GetProperty(c, 'height')) / c.height;

    if (Defined(e.offsetX)) {
        xy = { x: e.offsetX, y: e.offsetY };
    } else {
        p = AbsPos(c.id);
        if (Defined(e.changedTouches)) {
            e = e.changedTouches[0];
        }
        if (e.pageX) {
            xy = {
                x: e.pageX - p.x,
                y: e.pageY - p.y
            };
        }
    }

    if (xy && xmul && ymul) {
        xy.x /= xmul;
        xy.y /= ymul;
    }

    return xy;
}

// Many event handlers -- keep as functions
function MouseOut(e: any) {
    const cv = e.target || e.fromElement.parentNode,
        tc = (TagCanvas as any).tc[cv.id];
    if (tc) {
        tc.mx = tc.my = -1;
        tc.UnFreeze();
        tc.EndDrag();
    }
}

function MouseMove(e: any) {
    let i: any, t: any = TagCanvas,
        tc: any, p: any, tg = EventToCanvasId(e);
    for (i in t.tc) {
        tc = t.tc[i];
        if (tc.tttimer) {
            clearTimeout(tc.tttimer);
            tc.tttimer = null;
        }
    }
    if (tg && t.tc[tg]) {
        tc = t.tc[tg];
        if (p = EventXY(e, tc.canvas)) {
            tc.mx = p.x;
            tc.my = p.y;
            tc.Drag(e, p);
        }
        tc.drawn = 0;
    }
}

function MouseDown(e: any) {
    const t = TagCanvas,
        cb = document.addEventListener ? 0 : 1,
        tg = EventToCanvasId(e);
    if (tg && e.button == cb && t.tc[tg]) {
        t.tc[tg].BeginDrag(e);
    }
}

function MouseUp(e: any) {
    const t = TagCanvas,
        cb = document.addEventListener ? 0 : 1,
        tg = EventToCanvasId(e);
    if (tg && e.button == cb && t.tc[tg]) {
        const tc = t.tc[tg];
        MouseMove(e);
        if (!tc.EndDrag() && !tc.touchState) tc.Clicked(e);
    }
}

function TouchDown(e: any) {
    const tg = EventToCanvasId(e),
        tc = (tg && (TagCanvas as any).tc[tg]),
        p: any;
    if (tc && e.changedTouches) {
        if (e.touches.length == 1 && tc.touchState == 0) {
            tc.touchState = 1;
            tc.BeginDrag(e);
            if (p = EventXY(e, tc.canvas)) {
                tc.mx = p.x;
                tc.my = p.y;
                tc.drawn = 0;
            }
        } else if (e.targetTouches.length == 2 && tc.pinchZoom) {
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
    const tg = EventToCanvasId(e),
        tc = (tg && (TagCanvas as any).tc[tg]);
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
        }
        tc.touchState = 0;
    }
}

function TouchMove(e: any) {
    let i: any, t = TagCanvas,
        tc: any, p: any, tg = EventToCanvasId(e);
    for (i in t.tc) {
        tc = t.tc[i];
        if (tc.tttimer) {
            clearTimeout(tc.tttimer);
            tc.tttimer = null;
        }
    }
    tc = (tg && t.tc[tg]);
    if (tc && e.changedTouches && tc.touchState) {
        switch (tc.touchState) {
            case 1:
            case 2:
                if (p = EventXY(e, tc.canvas)) {
                    tc.mx = p.x;
                    tc.my = p.y;
                    if (tc.Drag(e, p)) tc.touchState = 2;
                }
                break;
            case 3:
                tc.Pinch(e);
        }
        tc.drawn = 0;
    }
}

function MouseWheel(e: any) {
    const t = TagCanvas,
        tg = EventToCanvasId(e);
    if (tg && t.tc[tg]) {
        e.cancelBubble = true;
        e.returnValue = false;
        e.preventDefault && e.preventDefault();
        t.tc[tg].Wheel((e.wheelDelta || e.detail) > 0);
    }
}

function Scroll(e: any) {
    let i: any, t = TagCanvas;
    clearTimeout((t as any).scrollTimer);
    for (i in t.tc) t.tc[i].Pause();
    (t as any).scrollTimer = setTimeout(function() {
        let i: any, t = TagCanvas;
        for (i in t.tc) t.tc[i].Resume();
    }, (t as any).scrollPause);
}

function DrawCanvas() {
    DrawCanvasRAF(TimeNow());
}

function DrawCanvasRAF(t ? : number) {
    const tc = (TagCanvas as any).tc;
    (TagCanvas as any).NextFrame((TagCanvas as any).interval);
    t = t || TimeNow();
    for (const i in tc) tc[i].Draw(t);
}

function NextFrameRAF() {
    requestAnimationFrame(DrawCanvasRAF as any);
}

function NextFrameTimeout(iv: number) {
    setTimeout(DrawCanvas, iv);
}

function AbsPos(id: string) {
    const e = document.getElementById(id) !;
    const r = e.getBoundingClientRect();
    const dd = document.documentElement,
        b = document.body,
        w = window;
    const xs = w.pageXOffset || dd.scrollLeft,
        ys = w.pageYOffset || dd.scrollTop,
        xo = dd.clientLeft || b.clientLeft,
        yo = dd.clientTop || b.clientTop;
    return {
        x: r.left + xs - xo,
        y: r.top + ys - yo
    };
}

function Project(tc: any, p1: any, sx: number, sy: number) {
    const m = tc.radius * tc.z1 / (tc.z1 + tc.z2 + p1.z);
    return {
        x: p1.x * m * sx,
        y: p1.y * m * sy,
        z: p1.z,
        w: (tc.z1 - p1.z) / tc.z2
    };
}

class TextSplitter {
    e: any;
    br: number;
    line: string[];
    text: string[];
    original: string;
    
    constructor(e: any) {
        this.e = e;
        this.br = 0;
        this.line = [];
        this.text = [];
        this.original = e.innerText || e.textContent;
    }

    public Empty() {
        for (let i = 0; i < this.text.length; ++i)
            if (this.text[i].length) return false;
        return true;
    }

    public Lines(e?: any) {
        let r = e ? 1 : 0,
            cn, cl, i;
        e = e || this.e;
        cn = e.childNodes;
        cl = cn.length;
        for (i = 0; i < cl; ++i) {
            if (cn[i].nodeName == 'BR') {
                this.text.push(this.line.join(' '));
                this.br = 1;
            } else if (cn[i].nodeType == 3) {
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

    public SplitWidth(w: number, c: CanvasRenderingContext2D, f: string, h: number) {
        let i, j, words, text: any[] = [];
        c.font = h + 'px ' + f;
        for (i = 0; i < this.text.length; ++i) {
            words = this.text[i].split(/\s+/);
            this.line = [words[0]];
            for (j = 1; j < words.length; ++j) {
                if (c.measureText(this.line.join(' ') + ' ' + words[j]).width > w) {
                    text.push(this.line.join(' '));
                    this.line = [words[j]];
                } else {
                    this.line.push(words[j]);
                }
            }
            text.push(this.line.join(' '));
        }
        return this.text = text;
    }
}

class Tag {
    tc: any;
    image: any;
    text: any;
    text_original: any;
    line_widths: any[];
    title: any;
    a: any;
    position: Vector;
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    colour: any;
    bgColour: any;
    bgRadius: number;
    bgOutline: any;
    bgOutlineThickness: number;
    textFont: any;
    padding: number;
    sc: number;
    alpha: number;
    weighted: boolean;
    outline: Outline;
    audio: any;
    fimage: any;
    iw: any;
    ih: any;
    oscale: any;
    oimage: any;
    alt: any;
    playing: any;
    stopped: any;
    track: any;
    gain: any;
    
    constructor(tc: any, text: any, a: any, v: any, w: number, h: number, col: any, bcol: any, bradius: number, boutline: any, bothickness: number, font: any, padding: number, original: any) {
        this.tc = tc;
        this.image = null;
        this.text = text;
        this.text_original = original;
        this.line_widths = [];
        this.title = a.title || null;
        this.a = a;
        this.position = new Vector(v[0], v[1], v[2]);
        this.x = this.y = this.z = 0;
        this.w = w;
        this.h = h;
        this.colour = col || tc.textColour;
        this.bgColour = bcol || tc.bgColour;
        this.bgRadius = bradius | 0;
        this.bgOutline = boutline || this.colour;
        this.bgOutlineThickness = bothickness | 0;
        this.textFont = font || tc.textFont;
        this.padding = padding | 0;
        this.sc = this.alpha = 1;
        this.weighted = !tc.weight;
        this.outline = new Outline(tc, this);
        this.audio = null;
    }

    Init(e?: any) {
        const tc = this.tc;
        this.textHeight = tc.textHeight;
        if (this.HasText()) {
            this.Measure(tc.ctxt, tc);
        } else {
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
        if (this.a.href != e.href) return 0;
        if (i.length) return this.image.src == i[0].src;
        return (e.innerText || e.textContent) == this.text_original;
    }

    SetImage(i: any) {
        this.image = this.fimage = i;
    }

    SetAudio(a: any) {
        this.audio = a;
        this.audio.load();
    }

    SetDraw(t: any) {
        this.Draw = this.fimage ? (t.ie > 7 ? this.DrawImageIE : this.DrawImage) : this.DrawText;
        t.noSelect && (this.CheckActive = Nop);
    }

    MeasureText(c: CanvasRenderingContext2D) {
        let l = this.text.length,
            w = 0,
            wl;
        for (let i = 0; i < l; ++i) {
            this.line_widths[i] = wl = c.measureText(this.text[i]).width;
            w = max(w, wl);
        }
        return w;
    }
    
    Measure(c: CanvasRenderingContext2D, t: any) {
        const extents = FindTextBoundingBox(this.text, this.textFont, this.textHeight),
            s: any, th: any, f: any, soff: any, cw: any, twidth: any, theight: any, img: any, tcv: any;
        let theightLocal = extents ? extents.max.y + extents.min.y : this.textHeight;
        c.font = this.font = this.textHeight + 'px ' + this.textFont;
        twidth = this.MeasureText(c);
        if (t.txtOpt) {
            s = t.txtScale;
            th = s * this.textHeight;
            f = th + 'px ' + this.textFont;
            soff = [s * t.shadowOffset[0], s * t.shadowOffset[1]];
            c.font = f;
            cw = this.MeasureText(c);
            tcv = new TextCanvas(this.text, f, cw + s, (s * theightLocal) + s, cw, this.line_widths, t.textAlign, t.textVAlign, s);
            if (this.image) tcv.SetImage(this.image, this.iw, this.ih, t.imagePosition, t.imagePadding, t.imageAlign, t.imageVAlign, t.imageScale);
            img = tcv.Create(this.colour, this.bgColour, this.bgOutline, s * this.bgOutlineThickness, t.shadow, s * t.shadowBlur, soff, s * this.padding, s * this.bgRadius);
            if (t.outlineMethod == 'colour') {
                this.oimage = tcv.Create(this.outline.colour, this.bgColour, this.outline.colour, s * this.bgOutlineThickness, t.shadow, s * t.shadowBlur, soff, s * this.padding, s * this.bgRadius);
            } else if (t.outlineMethod == 'size') {
                const ext = FindTextBoundingBox(this.text, this.textFont, this.textHeight + t.outlineIncrease);
                const th2 = ext.max.y + ext.min.y;
                const f2 = (s * (this.textHeight + t.outlineIncrease)) + 'px ' + this.textFont;
                c.font = f2;
                cw = this.MeasureText(c);
                tcv = new TextCanvas(this.text, f2, cw + s, (s * th2) + s, cw, this.line_widths, t.textAlign, t.textVAlign, s);
                if (this.image) tcv.SetImage(this.image, this.iw + t.outlineIncrease, this.ih + t.outlineIncrease, t.imagePosition, t.imagePadding, t.imageAlign, t.imageVAlign, t.imageScale);
                this.oimage = tcv.Create(this.colour, this.bgColour, this.bgOutline, s * this.bgOutlineThickness, t.shadow, s * t.shadowBlur, soff, s * this.padding, s * this.bgRadius);
                this.oscale = this.oimage.width / img.width;
                if (t.outlineIncrease > 0) img = ExpandImage(img, this.oimage.width, this.oimage.height);
                else this.oimage = ExpandImage(this.oimage, img.width, img.height);
            }
            if (img) {
                this.fimage = img;
                twidth = this.fimage.width / s;
                theightLocal = this.fimage.height / s;
            }
            this.SetDraw(t);
            t.txtOpt = !!this.fimage;
        }
        this.h = theightLocal;
        this.w = twidth;
    }
    SetFont(f: any, c: any, bc: any, boc: any) {
        this.textFont = f;
        this.colour = c;
        this.bgColour = bc;
        this.bgOutline = boc;
        this.Measure(this.tc.ctxt, this.tc);
    }
    SetWeight(w: any) {
        const tc = this.tc,
            modes = tc.weightMode.split(/[, ]/),
            m: any, s: any, wl = w.length;
        if (!this.HasText()) return;
        this.weighted = true;
        for (s = 0; s < wl; ++s) {
            m = modes[s] || 'size';
            if ('both' == m) {
                this.Weight(w[s], tc.ctxt, tc, 'size', tc.min_weight[s], tc.max_weight[s], s);
                this.Weight(w[s], tc.ctxt, tc, 'colour', tc.min_weight[s], tc.max_weight[s], s);
            } else {
                this.Weight(w[s], tc.ctxt, tc, m, tc.min_weight[s], tc.max_weight[s], s);
            }
        }
        this.Measure(tc.ctxt, tc);
    }
    Weight(w: any, c: CanvasRenderingContext2D, t: any, m: any, wmin: any, wmax: any, wnum: any) {
        w = isNaN(w) ? 1 : w;
        const nweight = (w - wmin) / (wmax - wmin);
        if ('colour' == m) this.colour = FindGradientColour(t, nweight, wnum);
        else if ('bgcolour' == m) this.bgColour = FindGradientColour(t, nweight, wnum);
        else if ('bgoutline' == m) this.bgOutline = FindGradientColour(t, nweight, wnum);
        else if ('outline' == m) this.outline.colour = FindGradientColour(t, nweight, wnum);
        else if ('size' == m) {
            if (t.weightSizeMin > 0 && t.weightSizeMax > t.weightSizeMin) this.textHeight = t.weightSize * (t.weightSizeMin + (t.weightSizeMax - t.weightSizeMin) * nweight);
            else this.textHeight = max(1, w * t.weightSize);
        }
    }
    SetShadowColourFixed(c: any, s: any, a: any) {
        c.shadowColor = s;
    }
    SetShadowColourAlpha(c: any, s: any, a: any) {
        c.shadowColor = SetAlpha(s, a);
    }
    DrawText(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
        const t = this.tc,
            x = this.x,
            y = this.y,
            s = this.sc;
        let i, xl;
        c.globalAlpha = this.alpha;
        c.fillStyle = this.colour;
        t.shadow && this.SetShadowColour(c, t.shadow, this.alpha);
        c.font = this.font;
        let yy = y + (yoff / s) - (this.h / 2);
        for (i = 0; i < this.text.length; ++i) {
            xl = x;
            if ('right' == t.textAlign) xl += this.w / 2 - this.line_widths[i];
            else if ('centre' == t.textAlign) xl -= this.line_widths[i] / 2;
            else xl -= this.w / 2;
            c.setTransform(s, 0, 0, s, s * xl, s * yy);
            c.fillText(this.text[i], 0, 0);
            yy += this.textHeight;
        }
    }
    DrawImage(c: CanvasRenderingContext2D, xoff: number, yoff: number, im ? : any) {
        const x = this.x,
            y = this.y,
            s = this.sc,
            i = im || this.fimage,
            w = this.w,
            h = this.h,
            a = this.alpha,
            shadow = this.shadow;
        c.globalAlpha = a;
        shadow && this.SetShadowColour(c, shadow, a);
        const xx = (xoff / s) - (w / 2),
            yy = (yoff / s) - (h / 2);
        c.setTransform(s, 0, 0, s, s * (x + xx), s * (y + yy));
        c.drawImage(i, 0, 0, w, h);
    }
    DrawImageIE(c: any, xoff: number, yoff: number) {
        const i = this.fimage,
            s = this.sc,
            w = i.width = this.w * s,
            h = i.height = this.h * s,
            x = (this.x * s) + xoff - (w / 2),
            y = (this.y * s) + yoff - (h / 2);
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = this.alpha;
        c.drawImage(i, x, y);
    }
    Calc(m: any, a: number) {
        const pp = m.xform(this.position);
        this.xformed = pp;
        const pp2 = Project(this.tc, pp, this.tc.stretchX, this.tc.stretchY);
        this.x = pp2.x;
        this.y = pp2.y;
        this.z = pp2.z;
        this.sc = pp2.w;
        this.alpha = a * Clamp(this.tc.minBrightness + (this.tc.maxBrightness - this.tc.minBrightness) * (this.tc.max_radius - this.z) / (2 * this.tc.max_radius), 0, 1);
        return this.xformed;
    }
    UpdateActive(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
        const o = this.outline,
            w = this.w,
            h = this.h,
            x = this.x - w / 2,
            y = this.y - h / 2;
        o.Update(x, y, w, h, this.sc, this.z, xoff, yoff);
        return o;
    }
    CheckActive(c: CanvasRenderingContext2D, xoff: number, yoff: number) {
        const t = this.tc,
            o = this.UpdateActive(c, xoff, yoff);
        return o.Active(c, t.mx, t.my) ? o : null;
    }
    Clicked(e ? : any) {
        const a = this.a,
            t = a.target,
            h = a.href;
        if (t != '' && t != '_self') {
            if ((self as any).frames[t]) {
                (self as any).frames[t].document.location = h;
            } else {
                try {
                    if ((top as any).frames[t]) {
                        (top as any).frames[t].document.location = h;
                        return;
                    }
                } catch (err) {}
                window.open(h, t);
            }
            return;
        }
        if (document.createEvent) {
            const evt = document.createEvent('MouseEvents');
            evt.initMouseEvent('click', 1, 1, window, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null);
            if (!a.dispatchEvent(evt)) return;
        } else if ((a as any).fireEvent) {
            if (!(a as any).fireEvent('onclick')) return;
        }
        document.location = h;
    }
    StopAudio() {
        this.audio && this.playing && this.audio.pause();
        this.stopped = 1;
        this.playing = 0;
    }
    PlayAudio() {
        if ((globalThis as any).audio === 'off' || this.tc.audioOff) return;
        if (!(globalThis as any).audio && !SetupAudio()) return;
        let a = this.tc.audio,
            g = this.tc.gain,
            sus = 'suspended',
            p: any;
        if (this.audio) {
            if (!this.track) {
                this.track = (globalThis as any).audio.createMediaElementSource(this.audio);
                this.gain = (globalThis as any).audio.createGain();
                this.track.connect(this.gain);
                this.gain.connect((globalThis as any).audio.destination);
            }
            a = this.audio;
            g = this.gain;
            if (!a.paused) return 1;
        }
        if (a) {
            if ((globalThis as any).audio.state == sus)(globalThis as any).audio.resume();
            if ((globalThis as any).audio.state == sus) return;
            g.gain.value = min(2, max(0, this.tc.audioVolume * 1));
            a.currentTime = 0;
            this.stopped = 0;
            p = a.play();
            if (p !== undefined) {
                p.then((r: any) => {
                    this.stopped ? this.audio.pause() : this.playing = 1;
                });
            }
            return 1;
        }
    }
}

/* TagCanvas class */
export class TagCanvas {
    static tc: Record<string, any> = {};
    static options: TagCanvasOptions = {
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
        centreFunc: Nop,
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
        altImage: 0
    };

    static NextFrame: any;
    static interval: number;
    static started: number;
    static scrollPause: any = 0;
    static scrollTimer: any = null;

    // instance properties are many; use any for brevity
    canvas: HTMLCanvasElement; ctxt: CanvasRenderingContext2D; z1: number; z2: number; radius: number; max_radius: number; max_weight: any[]; min_weight: any[]; textFont: any; textHeight: number; imageRadius: any; pulsateTo: number; minBrightness: number; maxBrightness: number; lx: number; ly: number; frozen: any; dx: any; dy: any; fixedAnim: any; touchState: any; fixedAlpha: any; source: any; repeatTags: any; minTags: any; transform: any; startTime: any; time: any; mx: any; my: any; centreImage: any; Animate: any; animTiming: any; shadow: Boolean | undefined; shadowAlpha: any; audio: any; activeAudio: any; currentAudio: any; ttdiv: any; tooltip: any; tooltipClass: any; ttimer: any; taglist: any[]; listLength: number; // etc

    constructor(cid: string, lctr?: string, opt?: TagCanvasOptions) {
        const c = document.getElementById(cid) as HTMLCanvasElement | null; if (!c) throw new Error('Canvas not found'); if (Defined((window as any).G_vmlCanvasManager)) { (window as any).G_vmlCanvasManager.initElement(c); (this as any).ie = parseFloat(navigator.appVersion.split('MSIE')[1]); }
        if (c && (!c.getContext || !c.getContext('2d')!.fillText)) { const p = document.createElement('DIV'); p.id = c.id; p.className = c.className; p.innerHTML = c.innerHTML; c.parentNode!.insertBefore(p, c); c.parentNode!.removeChild(c); throw new Error('Canvas unsupported'); }
        // assign options
        for (const k in (TagCanvas as any).options) (this as any)[k] = opt && Defined((opt as any)[k]) ? (opt as any)[k] : ((Defined((TagCanvas as any)[k]) ? (TagCanvas as any)[k] : (TagCanvas as any).options[k]));
        this.canvas = c;
        this.ctxt = c.getContext('2d') as CanvasRenderingContext2D;
        this.z1 = 250 / max((this as any).depth, 0.001);
        this.z2 = this.z1 / (this as any).zoom;
        this.radius = min(c.height, c.width) * 0.0075;
        this.max_radius = 100;
        this.max_weight = [];
        this.min_weight = [];
        this.textFont = (this as any).textFont && FixFont((this as any).textFont);
        this.textHeight = (this as any).textHeight * 1;
        this.imageRadius = (this as any).imageRadius.toString();
        this.pulsateTo = Clamp((this as any).pulsateTo, 0, 1);
        this.minBrightness = Clamp((this as any).minBrightness, 0, 1);
        this.maxBrightness = Clamp((this as any).maxBrightness, this.minBrightness, 1);
        this.ctxt.textBaseline = 'top';
        this.lx = ((this as any).lock + '').indexOf('x') + 1;
        this.ly = ((this as any).lock + '').indexOf('y') + 1;
        this.frozen = this.dx = this.dy = this.fixedAnim = this.touchState = 0;
        this.fixedAlpha = 1;
        this.source = lctr || cid;
        this.repeatTags = min(64, ~~(this as any).repeatTags);
        this.minTags = min(200, ~~(this as any).minTags);
        if (~~(this as any).scrollPause > 0) (TagCanvas as any).scrollPause = ~~(this as any).scrollPause; else (this as any).scrollPause = 0;
        if (this.minTags > 0 && this.repeatTags < 1 && this.GetTags().length) this.repeatTags = ceil(this.minTags / this.GetTags().length) - 1;
        this.transform = Matrix.Identity();
        this.startTime = this.time = TimeNow();
        this.mx = this.my = -1;
        if ((this as any).centreImage) CentreImage(this);
        this.Animate = (this as any).dragControl ? (this as any).AnimateDrag : (this as any).AnimatePosition;
        this.animTiming = (typeof (TagCanvas as any)[(this as any).animTiming] == 'function' ? (TagCanvas as any)[(this as any).animTiming] : (TagCanvas as any).Smooth);
        if ((this as any).shadowBlur || (this as any).shadowOffset[0] || (this as any).shadowOffset[1]) { this.ctxt.shadowColor = (this as any).shadow; (this as any).shadow = this.ctxt.shadowColor; (this as any).shadowAlpha = ShadowAlphaBroken(); } else { delete (this as any).shadow; }
        if ((this as any).activeAudio === false) (globalThis as any).audio = 'off'; else (this as any).activeAudio && this.LoadAudio();
        this.Load();
        if (lctr && (this as any).hideTags) { ((t: any) => { if ((TagCanvas as any).loaded) t.HideTags(); else AddHandler('load', function () { t.HideTags(); }, window); })(this); }
        this.yaw = (this as any).initial ? (this as any).initial[0] * (this as any).maxSpeed : 0; this.pitch = (this as any).initial ? (this as any).initial[1] * (this as any).maxSpeed : 0;
        if ((this as any).tooltip) { (this as any).ctitle = c.title; c.title = ''; if ((this as any).tooltip == 'native') { (this as any).Tooltip = (this as any).TooltipNative; } else { (this as any).Tooltip = (this as any).TooltipDiv; if (!(this as any).ttdiv) { (this as any).ttdiv = document.createElement('div'); (this as any).ttdiv.className = (this as any).tooltipClass; (this as any).ttdiv.style.position = 'absolute'; (this as any).ttdiv.style.zIndex = c.style.zIndex + 1; AddHandler('mouseover', function (e: any) { e.target.style.display = 'none'; }, (this as any).ttdiv); document.body.appendChild((this as any).ttdiv); } } } else { (this as any).Tooltip = (this as any).TooltipNone; }
        if (!(this as any).noMouse && !(handlers as any)[cid]) { (handlers as any)[cid] = [['mousemove', MouseMove], ['mouseout', MouseOut], ['mouseup', MouseUp], ['touchstart', TouchDown], ['touchend', TouchUp], ['touchcancel', TouchUp], ['touchmove', TouchMove]]; if ((this as any).dragControl) { (handlers as any)[cid].push(['mousedown', MouseDown]); (handlers as any)[cid].push(['selectstart', Nop]); } if ((this as any).wheelZoom) { (handlers as any)[cid].push(['mousewheel', MouseWheel]); (handlers as any)[cid].push(['DOMMouseScroll', MouseWheel]); } if ((this as any).scrollPause) { (handlers as any)[cid].push(['scroll', Scroll, window]); } for (let ii = 0; ii < (handlers as any)[cid].length; ++ii) { const p = (handlers as any)[cid][ii]; AddHandler(p[0], p[1], p[2] ? p[2] : c); } }
        if (!(TagCanvas as any).started) { (TagCanvas as any).NextFrame = window.requestAnimationFrame ? NextFrameRAF : NextFrameTimeout; (TagCanvas as any).interval = (this as any).interval; (TagCanvas as any).NextFrame((this as any).interval); (TagCanvas as any).started = 1; }
    }

    // Many prototype methods simplified: keep names and types as any for now
    SourceElements() { if (document.querySelectorAll) return document.querySelectorAll('#' + (this as any).source); return [document.getElementById((this as any).source)]; }
    HideTags() { const el = this.SourceElements(); for (let i = 0; i < (el as any).length; ++i) (el as any)[i].style.display = 'none'; }
    GetTags() { const el = this.SourceElements(), tl: any[] = []; for (let k = 0; k <= (this as any).repeatTags; ++k) { for (let i = 0; i < (el as any).length; ++i) { const etl = (el as any)[i].getElementsByTagName('a'); for (let j = 0; j < etl.length; ++j) tl.push(etl[j]); } } return tl; }
    Message(text: string) { const tl: any[] = [], tc = text.split(''), a: any, t: any, x: any, z: any; for (let i = 0; i < tc.length; ++i) { if (tc[i] != ' ') { const p = i - tc.length / 2; a = document.createElement('A'); a.href = '#'; a.innerText = tc[i]; x = 100 * sin(p / 9); z = -100 * cos(p / 9); t = new Tag(this, tc[i], a, [x, 0, z], 2, 18, '#000', '#fff', 0, 0, 0, 'monospace', 2, tc[i]); t.Init(); tl.push(t); } } return tl; }
    AddAudio(e: any, t: any) { if ((globalThis as any).audio === 'off') return; const au = e.getElementsByTagName('audio'); if (au.length) { t.SetAudio(au[0]); (this as any).hasAudio = 1; } }
    CreateTag(e: any) { // simplified, delegates to Tag and AddImage etc
        const im = e.getElementsByTagName ? e.getElementsByTagName('img') : []; if (im.length) { const i = new Image(); i.src = im[0].src; if (!(this as any).imageMode) { const t = new Tag(this, "", e, [0, 0, 0], 0, 0); t.SetImage(i); AddImage(i, im[0], im[1], t, this); this.AddAudio(e, t); return t; } }
        const ts = new TextSplitter(e); const txt = ts.Lines(); if (!ts.Empty()) { const font = (this as any).textFont || FixFont(GetProperty(e, 'font-family')); if ((this as any).splitWidth) txt = ts.SplitWidth((this as any).splitWidth, (this as any).ctxt, font, (this as any).textHeight); const bc = (this as any).bgColour == 'tag' ? GetProperty(e, 'background-color') : (this as any).bgColour; const boc = (this as any).bgOutline == 'tag' ? GetProperty(e, 'color') : (this as any).bgOutline; const t = new Tag(this, txt, e, [0, 0, 0], 2, (this as any).textHeight + 2, (this as any).textColour || GetProperty(e, 'color'), bc, (this as any).bgRadius, boc, (this as any).bgOutlineThickness, font, (this as any).padding, ts && ts.original); t.Init(); this.AddAudio(e, t); return t; }
    }
    UpdateTag(t: any, a: any) { const colour = (this as any).textColour || GetProperty(a, 'color'), font = (this as any).textFont || FixFont(GetProperty(a, 'font-family')), bc = (this as any).bgColour == 'tag' ? GetProperty(a, 'background-color') : (this as any).bgColour, boc = (this as any).bgOutline == 'tag' ? GetProperty(a, 'color') : (this as any).bgOutline; t.a = a; t.title = a.title; if (t.colour != colour || t.textFont != font || t.bgColour != bc || t.bgOutline != boc) t.SetFont(font, colour, bc, boc); }
    Weight(tl: any) { const ll = tl.length, weights: any[] = [], wfrom = (this as any).weightFrom ? (this as any).weightFrom.split(/[, ]/) : [null], wl = wfrom.length; for (let i = 0; i < ll; ++i) { weights[i] = []; for (let s = 0; s < wl; ++s) { const w = FindWeight(tl[i].a, wfrom[s], (this as any).textHeight); if (!(this as any).max_weight[s] || w > (this as any).max_weight[s]) (this as any).max_weight[s] = w; if (!(this as any).min_weight[s] || w < (this as any).min_weight[s]) (this as any).min_weight[s] = w; weights[i][s] = w; } } let valid = false; for (let s = 0; s < wl; ++s) if ((this as any).max_weight[s] > (this as any).min_weight[s]) valid = true; if (valid) for (let i = 0; i < ll; ++i) tl[i].SetWeight(weights[i]); }
    Load() { const tl = this.GetTags(), taglist: any[] = [], pfuncs: any = { sphere: PointsOnSphere, vcylinder: PointsOnCylinderV, hcylinder: PointsOnCylinderH, vring: PointsOnRingV, hring: PointsOnRingH }; if (tl.length) { const tagmap = new Array(tl.length); for (let i = 0; i < tl.length; ++i) tagmap[i] = i; (this as any).shuffleTags && Shuffle(tagmap); const rx = 100 * (this as any).radiusX, ry = 100 * (this as any).radiusY, rz = 100 * (this as any).radiusZ; (this as any).max_radius = max(rx, max(ry, rz)); for (let i = 0; i < tl.length; ++i) { const t = this.CreateTag(tl[tagmap[i]]); if (t) taglist.push(t); } (this as any).weight && this.Weight(taglist); let shapeArgs: any; if ((this as any).shapeArgs) { (this as any).shapeArgs[0] = taglist.length; } else { let shapeArgsArr = (this as any).shape.toString().split(/[(),]/); let shape = shapeArgsArr.shift(); if (typeof (window as any)[shape] === 'function') (this as any).shape = (window as any)[shape]; else (this as any).shape = pfuncs[shape] || pfuncs.sphere; (this as any).shapeArgs = [taglist.length, rx, ry, rz].concat(shapeArgsArr); } const vl = (this as any).shape.apply(this, (this as any).shapeArgs); (this as any).listLength = taglist.length; for (let i = 0; i < taglist.length; ++i) taglist[i].position = new Vector(vl[i][0], vl[i][1], vl[i][2]); } if ((this as any).noTagsMessage && !taglist.length) { const iMode = ((this as any).imageMode && (this as any).imageMode != 'both' ? (this as any).imageMode + ' ' : ''); const msg = this.Message('No ' + iMode + 'tags'); (this as any).taglist = msg; } else (this as any).taglist = taglist; }
    // many other methods omitted for brevity — they can be ported similarly if needed
    // minimal stubs to avoid runtime errors
    LoadAudio() { if (!(globalThis as any).audio && !SetupAudio()) return; (this as any).audio = document.createElement('audio'); (this as any).audio.src = (this as any).activeAudio; (this as any).track = (globalThis as any).audio.createMediaElementSource((this as any).audio); (this as any).gain = (globalThis as any).audio.createGain(); (this as any).track.connect((this as any).gain); (this as any).gain.connect((globalThis as any).audio.destination); (this as any).hasAudio = 1; const audioClick = function (e: any) { (globalThis as any).audio.resume(); document.removeEventListener('click', audioClick); }; document.addEventListener('click', audioClick); }
    ShowAudioIcon() { if (!(globalThis as any).audio) return; const s = (this as any).audioIconSize, cv = this.canvas, c = this.ctxt, x = cv.width - s - 3, y = cv.height - s - 3, t = (this as any).audioIconThickness; let c1 = '#000', c2 = '#fff', d = (this as any).audioIconDark, muted = (this as any).audioOff; let sus = 'suspended'; if (!muted) muted = ((globalThis as any).audio.state === sus); if ((this as any).audioIcon && (this as any).hasAudio) { AudioIcon(muted, c, s, x, y, t + 1, d ? c2 : c1); AudioIcon(muted, c, s, x, y, t, d ? c1 : c2); } }
}
