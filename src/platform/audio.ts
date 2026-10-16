/**
 * The lazily created, module-shared {@link AudioContext}.
 *
 * - `undefined`: creation has not been attempted yet
 * - `AudioContext`: the successfully created shared instance
 * - `null`: creation failed (never retried)
 */
let sharedAudioContext: AudioContext | null | undefined;

/**
 * Lazily creates and returns the shared {@link AudioContext}.
 *
 * Ported from the original `SetupAudio`, without its
 * `window.webkitAudioContext` fallback — only the standard `AudioContext` is
 * used. Returns `null` where audio is unavailable or creation fails; once it
 * has failed, subsequent calls keep returning `null` without retrying.
 */
export function getAudioContext(): AudioContext | null {
	if (sharedAudioContext !== undefined) {
		return sharedAudioContext;
	}
	try {
		sharedAudioContext = new AudioContext();
	} catch {
		sharedAudioContext = null;
	}
	return sharedAudioContext;
}

/** The set of audio nodes making up a single playback chain, as returned by {@link createTrack}. */
export interface AudioTrack {
	element: HTMLAudioElement;
	source: MediaElementAudioSourceNode;
	gain: GainNode;
}

/**
 * `AudioContext.createMediaElementSource` throws on the second and later calls
 * for the same `HTMLAudioElement`, so the {@link MediaElementAudioSourceNode}
 * created for each element is cached here.
 */
const sourceNodeCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

/**
 * Connects an `<audio>` element to the shared {@link AudioContext}, preparing
 * the source and gain nodes used for playback.
 *
 * This is the `createMediaElementSource` -> `createGain` -> `connect` setup the
 * original performed in `Tproto.PlayAudio` (per-tag audio) and
 * `TCproto.LoadAudio` (the cloud's `activeAudio`). The
 * `MediaElementAudioSourceNode` is cached per element, so calling this more
 * than once for the same element is safe: later calls create only a new
 * `GainNode` and reconnect it to the cached source.
 *
 * Returns `null` where the `AudioContext` is unavailable.
 */
export function createTrack(el: HTMLAudioElement): AudioTrack | null {
	const ctx = getAudioContext();
	if (!ctx) {
		return null;
	}

	let source = sourceNodeCache.get(el);
	if (!source) {
		source = ctx.createMediaElementSource(el);
		sourceNodeCache.set(el, source);
	}

	const gain = ctx.createGain();
	source.connect(gain);
	gain.connect(ctx.destination);

	return { element: el, source, gain };
}

/**
 * Tears a track down (used by `destroy`). Only disconnects the `gain` node from
 * the destination; the shared {@link AudioContext} itself is never `close`d,
 * since other cloud instances rely on it.
 */
export function disposeTrack(track: AudioTrack): void {
	track.gain.disconnect();
}

/**
 * Strokes the speaker/mute icon path.
 *
 * Internal helper carrying over the path coordinates and drawing logic of the
 * original `AudioIcon(mute, c, size, offsetx, offsety, stroke, colour)` verbatim.
 */
function paintIconPath(
	ctx: CanvasRenderingContext2D,
	muted: boolean,
	x: number,
	y: number,
	size: number,
	stroke: number,
	color: string,
): void {
	const s = size * 0.01;
	const w = 80 * s;
	const h = 100 * s;
	const d = 40 * s;
	const e = 30 * s;
	const f = e / 2;
	const x2 = x + w;
	const x1 = x2 - d;
	const y3 = y + h;
	const y2 = y3 - e;
	const y1 = y + e;
	const y4 = y + h / 2;

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.setLineDash([]);
	ctx.globalAlpha = 1;
	ctx.strokeStyle = color;
	ctx.lineWidth = stroke;
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x1, y2);
	ctx.moveTo(x2, y3);
	ctx.lineTo(x1, y2);
	ctx.lineTo(x, y2);
	ctx.lineTo(x, y1);
	ctx.lineTo(x1, y1);
	ctx.lineTo(x2, y);
	if (muted) {
		ctx.lineTo(x2, y1);
		ctx.moveTo(x2, y2);
		ctx.lineTo(x2, y3);
		ctx.moveTo(x2 - f, y4 - f);
		ctx.lineTo(x2 + f, y4 + f);
		ctx.moveTo(x2 + f, y4 - f);
		ctx.lineTo(x2 - f, y4 + f);
		ctx.stroke();
		return;
	}
	ctx.closePath();
	ctx.stroke();
}

/**
 * Draws the speaker icon.
 *
 * Covers both the original `AudioIcon` and its caller `TCproto.ShowAudioIcon`,
 * which invoked it twice:
 *
 * ```js
 * // original (c1 = '#000', c2 = '#fff', d = this.audioIconDark,
 * //           muted = this.audioOff || (audio.state === 'suspended'))
 * AudioIcon(muted, c, s, x, y, t + 1, d ? c2 : c1);
 * AudioIcon(muted, c, s, x, y, t,     d ? c1 : c2);
 * ```
 *
 * Stroking an outline of width `thickness + 1` in one color and then overlaying
 * a `thickness`-wide stroke in the other produces a two-tone icon that stays
 * legible against any background. When `dark` (the original `audioIconDark`) is
 * true the outline is white and the glyph black; when false, the reverse.
 *
 * @param ctx - the destination 2D context (the original `c`)
 * @param x - X offset of the icon's top-left corner (the original `offsetx`)
 * @param y - Y offset of the icon's top-left corner (the original `offsety`)
 * @param size - icon size (the original `size`, i.e. the `audioIconSize` option)
 * @param thickness - stroke width (the original `stroke`, i.e. the `audioIconThickness`
 *   option); used for the inner stroke, with the outline drawn one pixel wider
 * @param dark - draws a black glyph with a white outline when true, and a white
 *   glyph with a black outline when false (the original `audioIconDark`)
 * @param muted - draws the muted variant, adding the cross and cut-off strokes
 *   (the original `mute`)
 */
export function drawAudioIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	thickness: number,
	dark: boolean,
	muted: boolean,
): void {
	const black = '#000';
	const white = '#fff';
	paintIconPath(ctx, muted, x, y, size, thickness + 1, dark ? white : black);
	paintIconPath(ctx, muted, x, y, size, thickness, dark ? black : white);
}
