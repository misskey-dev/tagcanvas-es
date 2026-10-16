import type {
	AnimTiming,
	CenterFunc,
	ColorOption,
	EasingFunction,
	ImageAlign,
	ImageMode,
	ImagePosition,
	ImageVAlign,
	LockMode,
	Offset2D,
	OutlineMethod,
	ShapePointGenerator,
	TagShape,
	TextAlign,
	TextVAlign,
	TooltipMode,
	WeightGradient,
	WeightMode,
} from '@/types.js';
import { easings } from '@/math/easings.js';
import { clamp } from '@/math/utils.js';

/**
 * User-supplied options for a `TagCanvas` instance. All fields are optional; unset
 * fields fall back to {@link defaultOptions}.
 */
export interface TagCanvasOptions {
	/**
   * Source of the cloud's tags: an element containing them, a CSS selector resolving to
   * one, or `null` to read them from the canvas element itself.
   */
	tagContainer?: HTMLElement | string | null;
	/** Stops the cloud rotating and dims/greys out tags other than the active one. */
	freezeActive?: boolean;
	/** Stops rotation decelerating to a stop while `freezeActive` is engaged. */
	freezeDecel?: boolean;
	/** CSS cursor shown when hovering an active tag. */
	activeCursor?: string;
	/** Opacity (0..1) tags pulsate up to. */
	pulsateTo?: number;
	/** Duration, in seconds, of one pulsate cycle. */
	pulsateTime?: number;
	/** Reverses the direction of drag/momentum rotation. */
	reverse?: boolean;
	/** Perceived depth of the cloud; larger values flatten the 3D perspective. */
	depth?: number;
	/** Maximum rotation speed reached from mouse/touch movement or momentum. */
	maxSpeed?: number;
	/** Minimum constant rotation speed, applied even without user interaction. */
	minSpeed?: number;
	/** Per-frame decay factor (0..1) applied to rotation speed after interaction stops. */
	decel?: number;
	/** Brightness (0..1) of the most distant (smallest) tags. */
	minBrightness?: number;
	/** Brightness (0..1) of the nearest (largest) tags. */
	maxBrightness?: number;
	/** Outline color for the active tag. Also accepts `'tag'`/`'tagbg'` to reuse the tag's own colors. */
	outlineColor?: ColorOption;
	/** Outline stroke thickness in pixels. */
	outlineThickness?: number;
	/** Outline offset from the tag's bounding box, in pixels. */
	outlineOffset?: number;
	/** Strategy used to render the active tag's outline. */
	outlineMethod?: OutlineMethod;
	/** Corner radius of the outline box, in pixels. */
	outlineRadius?: number;
	/** Tag text color, or `null` to use each tag element's own CSS color. */
	textColor?: string | null;
	/** Base text height in pixels. */
	textHeight?: number;
	/** CSS font-family list for tag text, or `null`/empty to use each tag element's own font. */
	textFont?: string | null;
	/** Text shadow color. */
	shadow?: string;
	/** Text shadow blur radius in pixels. */
	shadowBlur?: number;
	/** Text shadow `[x, y]` offset in pixels. */
	shadowOffset?: Offset2D;
	/** Initial rotation speed `[x, y]` applied before any user interaction. */
	initial?: Offset2D | null;
	/** Hides the source tag markup (e.g. the `<ul>` list) once the canvas cloud is ready. */
	hideTags?: boolean;
	/** Initial zoom level. */
	zoom?: number;
	/** Enables weighting tags by `weightFrom`, modulated per `weightMode`. */
	weight?: boolean;
	/** Property (or properties) affected by tag weight. */
	weightMode?: WeightMode | WeightMode[];
	/** Attribute(s) read from each tag element to compute its weight; `null` uses tag text length. */
	weightFrom?: string | string[] | null;
	/** Scale factor applied to weight-derived text size. */
	weightSize?: number;
	/** Minimum text height weighting can produce, or `null` to derive it from `weightSize` alone. */
	weightSizeMin?: number | null;
	/** Maximum text height weighting can produce, or `null` to derive it from `weightSize` alone. */
	weightSizeMax?: number | null;
	/** Color gradient(s) (weight `0`..`1` stops to CSS colors) used for color-based weighting. */
	weightGradient?: WeightGradient | WeightGradient[];
	/** Pre-renders tag text/images to offscreen bitmaps instead of drawing text every frame. */
	txtOpt?: boolean;
	/** Supersampling scale factor used when pre-rendering tag text (`txtOpt`). */
	txtScale?: number;
	/** Rotates a clicked/tapped tag to the front before following its link. */
	frontSelect?: boolean;
	/** Enables zooming the cloud with the mouse wheel. */
	wheelZoom?: boolean;
	/** Minimum allowed zoom level. */
	zoomMin?: number;
	/** Maximum allowed zoom level. */
	zoomMax?: number;
	/** Zoom change per wheel notch. */
	zoomStep?: number;
	/** Built-in point-cloud shape name, or a custom generator function. */
	shape?: TagShape | ShapePointGenerator;
	/** Extra positional arguments forwarded to the `shape` generator. */
	shapeArgs?: number[];
	/** Restricts free-drag rotation to one axis, both, or none. */
	lock?: LockMode;
	/** Tooltip rendering strategy, or `null` to disable tooltips. */
	tooltip?: TooltipMode;
	/** Delay in milliseconds before a `'div'` tooltip appears. */
	tooltipDelay?: number;
	/** CSS class applied to the `'div'` tooltip element. */
	tooltipClass?: string;
	/** Cloud radius scale along the X axis. */
	radiusX?: number;
	/** Cloud radius scale along the Y axis. */
	radiusY?: number;
	/** Cloud radius scale along the Z axis. */
	radiusZ?: number;
	/** Horizontal stretch factor applied after projection. */
	stretchX?: number;
	/** Vertical stretch factor applied after projection. */
	stretchY?: number;
	/** Horizontal offset of the cloud's center, in pixels. */
	offsetX?: number;
	/** Vertical offset of the cloud's center, in pixels. */
	offsetY?: number;
	/** Randomizes which tag occupies which shape point. */
	shuffleTags?: boolean;
	/** Disables text selection over the canvas. */
	noSelect?: boolean;
	/** Disables all mouse/touch interaction with the cloud. */
	noMouse?: boolean;
	/** Scale factor applied to tag images. */
	imageScale?: number;
	/** Starts the cloud paused (no rotation, no animation). */
	paused?: boolean;
	/** Enables dragging the cloud to rotate it (as opposed to hover-follow). */
	dragControl?: boolean;
	/** Minimum drag distance, in pixels, before a drag is recognized (vs. a click). */
	dragThreshold?: number;
	/** Custom hook drawn at the cloud's center each frame, or `null` to disable. */
	centerFunc?: CenterFunc | null;
	/** Wrap width, in pixels, for tag text; `0` disables wrapping. */
	splitWidth?: number;
	/** Named easing curve or custom {@link EasingFunction} used for animated transitions. */
	animTiming?: AnimTiming;
	/** Milliseconds to animate a clicked tag to the front before navigating, or `false` to disable. */
	clickToFront?: number | false;
	/** Fade-in duration in seconds for newly drawn tags; `0` disables fade-in. */
	fadeIn?: number;
	/** Padding, in pixels, added around each tag's bounding box. */
	padding?: number;
	/** Tag background fill color, or `null` for none. Also accepts `'tag'`/`'tagbg'`. */
	bgColor?: ColorOption | null;
	/** Corner radius, in pixels, of the tag background. */
	bgRadius?: number;
	/** Tag background outline color, or `null` for none. Also accepts `'tag'`/`'tagbg'`. */
	bgOutline?: ColorOption | null;
	/** Tag background outline thickness in pixels. */
	bgOutlineThickness?: number;
	/** Amount, in pixels, the active tag's outline grows by. */
	outlineIncrease?: number;
	/** Extra amount, in pixels, drawn per outline dash segment. */
	outlineDash?: number;
	/** Gap, in pixels, between outline dash segments; `0` draws a solid outline. */
	outlineDashSpace?: number;
	/** Animation speed of marching outline dashes. */
	outlineDashSpeed?: number;
	/** Horizontal text alignment within a tag's bounding box. */
	textAlign?: TextAlign;
	/** Vertical text alignment within a tag's bounding box. */
	textVAlign?: TextVAlign;
	/** What a tag renders as: its image, its text, both, or (with `null`) whichever is available. */
	imageMode?: ImageMode;
	/** Placement of a tag's image relative to its text, or `null` to overlay them. */
	imagePosition?: ImagePosition;
	/** Padding, in pixels, between a tag's image and its text. */
	imagePadding?: number;
	/** Horizontal alignment of a tag's image within its bounding box. */
	imageAlign?: ImageAlign;
	/** Vertical alignment of a tag's image within its bounding box. */
	imageVAlign?: ImageVAlign;
	/** Shows a placeholder message on the canvas when there are no tags. */
	noTagsMessage?: boolean;
	/** URL of an image drawn at the cloud's center, or `null` for none. */
	centerImage?: string | null;
	/** Enables zooming the cloud with a two-finger pinch gesture. */
	pinchZoom?: boolean;
	/** Number of times each tag is duplicated around the shape; `0` disables repetition. */
	repeatTags?: number;
	/** Minimum total tag count to reach by auto-computing `repeatTags`; `0` disables this. */
	minTags?: number;
	/** Corner radius applied to tag images; a number in pixels, or a `'NN%'` string. */
	imageRadius?: number | string;
	/** Milliseconds to pause rotation after the page is scrolled, or `false` to disable. */
	scrollPause?: number | false;
	/** URL of the audio track played while a tag with `data-audio`-like content is active, or `false`/`''` to disable. */
	activeAudio?: string | false;
	/** Playback volume (0..1) for tag audio. */
	audioVolume?: number;
	/** Shows a mute/unmute icon on tags that have audio. */
	audioIcon?: boolean;
	/** Size, in pixels, of the audio icon. */
	audioIconSize?: number;
	/** Stroke thickness, in pixels, of the audio icon. */
	audioIconThickness?: number;
	/** Draws the audio icon in a dark color, for use over light backgrounds. */
	audioIconDark?: boolean;
	/** Uses each tag's `alt` image (if present) instead of its primary image. */
	altImage?: boolean;
}

// Typed as a plain object literal (rather than inline inside `Object.freeze`) so tuple
// fields like `shadowOffset` are contextually typed as `Offset2D` instead of `number[]`.
const defaultOptionsValues: Required<TagCanvasOptions> = {
	tagContainer: null,
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
	minBrightness: 0.1,
	maxBrightness: 1,
	outlineColor: '#ffff99',
	outlineThickness: 2,
	outlineOffset: 5,
	outlineMethod: 'outline',
	outlineRadius: 0,
	textColor: '#ff99ff',
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
	shapeArgs: [],
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
	centerFunc: null,
	splitWidth: 0,
	animTiming: 'smooth',
	clickToFront: false,
	fadeIn: 0,
	padding: 0,
	bgColor: null,
	bgRadius: 0,
	bgOutline: null,
	bgOutlineThickness: 0,
	outlineIncrease: 4,
	outlineDash: 0,
	outlineDashSpace: 0,
	outlineDashSpeed: 1,
	textAlign: 'center',
	textVAlign: 'middle',
	imageMode: null,
	imagePosition: null,
	imagePadding: 2,
	imageAlign: 'center',
	imageVAlign: 'middle',
	noTagsMessage: true,
	centerImage: null,
	pinchZoom: false,
	repeatTags: 0,
	minTags: 0,
	imageRadius: 0,
	scrollPause: false,
	activeAudio: '',
	audioVolume: 1,
	audioIcon: true,
	audioIconSize: 20,
	audioIconThickness: 2,
	audioIconDark: false,
	altImage: false,
};

// `Object.freeze` is shallow, so the mutable defaults are frozen individually too.
// Without this a caller could reach through `defaultOptions` and mutate them, changing
// the defaults for every instance created afterwards.
Object.freeze(defaultOptionsValues.shapeArgs);
Object.freeze(defaultOptionsValues.shadowOffset);
Object.freeze(defaultOptionsValues.weightGradient);

/**
 * Default value for every {@link TagCanvasOptions} field. Deeply read-only; there is no
 * global override mechanism (unlike the original `TagCanvas.options`) — pass options
 * directly to the `TagCanvas` constructor instead.
 *
 * Ported from `TagCanvas.options`.
 */
export const defaultOptions: Readonly<Required<TagCanvasOptions>> = Object.freeze(defaultOptionsValues);

/**
 * Fully-resolved, normalized options for a `TagCanvas` instance, as produced by
 * {@link resolveOptions}. Every field is present (defaults already applied) and a few
 * fields are further normalized/derived compared to {@link TagCanvasOptions}.
 */
export interface ResolvedOptions extends Omit<Required<TagCanvasOptions>, 'imageRadius'> {
	/** Same as `TagCanvasOptions.imageRadius`, coerced to a string. */
	imageRadius: string;
	/** Whether `lock` restricts rotation on the X axis. */
	lockX: boolean;
	/** Whether `lock` restricts rotation on the Y axis. */
	lockY: boolean;
	/** Easing function resolved from `animTiming`. */
	easing: EasingFunction;
	/** `weightMode` normalized to an array, one entry per weighting pass. */
	weightModes: WeightMode[];
	/** `weightFrom` normalized to an array, one entry per weighting pass. */
	weightFroms: (string | null)[];
	/** `weightGradient` normalized to an array, one entry per weighting pass. */
	weightGradients: WeightGradient[];
	/** `scrollPause`, truncated to a positive integer millisecond count, or `0` when disabled. */
	scrollPauseMs: number;
}

/**
 * Merges `options` over {@link defaultOptions} and normalizes the result into a frozen
 * {@link ResolvedOptions}.
 *
 * Ported from the constructor's option normalization. `shape` and `shapeArgs`
 * are intentionally left unresolved here (see `ResolvedOptions`) — resolving
 * a shape name/function is the caller's responsibility, to avoid this module
 * depending on the shapes registry.
 */
export function resolveOptions(options?: TagCanvasOptions): ResolvedOptions {
	const merged: Required<TagCanvasOptions> = { ...defaultOptions, ...options };

	const textFont = merged.textFont ? fixFont(merged.textFont) : merged.textFont;
	const imageRadius = merged.imageRadius.toString();
	const pulsateTo = clamp(merged.pulsateTo, 0, 1);
	const minBrightness = clamp(merged.minBrightness, 0, 1);
	const maxBrightness = clamp(merged.maxBrightness, minBrightness, 1);
	const repeatTags = Math.min(64, Math.trunc(merged.repeatTags));
	const minTags = Math.min(200, Math.trunc(merged.minTags));
	const lockX = merged.lock === 'x' || merged.lock === 'xy';
	const lockY = merged.lock === 'y' || merged.lock === 'xy';
	const easing = resolveEasing(merged.animTiming);
	// Everything below is copied out of `merged` before being frozen, so the resolved
	// options share no mutable object with the caller's options or with `defaultOptions`.
	// Freezing is applied as a statement so the declared (mutable) types are preserved.
	const weightModes: WeightMode[] = Array.isArray(merged.weightMode)
		? [...merged.weightMode]
		: [merged.weightMode];
	const weightFroms: (string | null)[] =
		merged.weightFrom === null
			? [null]
			: Array.isArray(merged.weightFrom)
				? [...merged.weightFrom]
				: [merged.weightFrom];
	const weightGradients: WeightGradient[] = (
		Array.isArray(merged.weightGradient) ? merged.weightGradient : [merged.weightGradient]
	).map((gradient) => Object.freeze({ ...gradient }));
	const shapeArgs: number[] = [...merged.shapeArgs];
	const shadowOffset: Offset2D = [merged.shadowOffset[0], merged.shadowOffset[1]];
	const initial: Offset2D | null =
		merged.initial === null ? null : [merged.initial[0], merged.initial[1]];
	Object.freeze(weightModes);
	Object.freeze(weightFroms);
	Object.freeze(weightGradients);
	Object.freeze(shapeArgs);
	Object.freeze(shadowOffset);
	if (initial !== null) Object.freeze(initial);
	const truncatedScrollPause = merged.scrollPause === false ? 0 : Math.trunc(merged.scrollPause);
	const scrollPauseMs = truncatedScrollPause > 0 ? truncatedScrollPause : 0;

	return Object.freeze({
		...merged,
		textFont,
		imageRadius,
		pulsateTo,
		minBrightness,
		maxBrightness,
		repeatTags,
		minTags,
		lockX,
		lockY,
		easing,
		weightModes,
		weightFroms,
		weightGradients,
		weightGradient: Array.isArray(merged.weightGradient) ? weightGradients : weightGradients[0],
		shapeArgs,
		shadowOffset,
		initial,
		scrollPauseMs,
	});
}

/** Resolves an `animTiming` value to a concrete {@link EasingFunction}. */
function resolveEasing(animTiming: AnimTiming): EasingFunction {
	if (typeof animTiming === 'function') return animTiming;
	return animTiming === 'linear' ? easings.linear : easings.smooth;
}

/**
 * Wraps a CSS `font-family` list in individually-quoted, comma-separated names (e.g.
 * `Helvetica, Arial` becomes `'Helvetica', 'Arial'`).
 *
 * Ported from `FixFont`.
 */
export function fixFont(font: string): string {
	return '\'' + font.replace(/['"]/g, '').replace(/\s*,\s*/g, '\', \'') + '\'';
}
