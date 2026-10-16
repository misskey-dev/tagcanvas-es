/** Same as a `string` type but allows autocompletion of literal values. */
export type AnyString = string & {};

/** Built-in 3D point-cloud arrangements a tag cloud can be laid out on. */
export type TagShape = 'sphere' | 'hcylinder' | 'vcylinder' | 'hring' | 'vring';

/**
 * Generates the 3D positions tags are distributed over.
 *
 * @param count - number of points to generate (one per tag)
 * @param radiusX - radius along the X axis
 * @param radiusY - radius along the Y axis
 * @param radiusZ - radius along the Z axis
 * @param args - extra shape-specific parameters (see `shapeArgs`)
 * @returns an array of `[x, y, z]` points, one per tag
 */
export type ShapePointGenerator = (
	count: number, radiusX: number, radiusY: number, radiusZ: number, ...args: number[]
) => [number, number, number][];

/** Color used for a tag's text, background, or outline. Can be a CSS color string, or the special values `'tag'` or `'tagbg'` to reuse the tag's own colors. */
export type ColorOption = 'tag' | 'tagbg' | AnyString;

/** Strategy used to draw a highlighted outline behind/around the active tag. */
export type OutlineMethod = 'outline' | 'classic' | 'block' | 'color' | 'size' | 'none';

/** Property (or properties) a tag's weight is used to modulate. */
export type WeightMode = 'size' | 'color' | 'bgcolor' | 'bgoutline' | 'outline' | 'both';

/** Horizontal text alignment. */
export type TextAlign = 'left' | 'center' | 'right';

/** Vertical text alignment. */
export type TextVAlign = 'top' | 'middle' | 'bottom';

/** What a tag renders as: its image, its text, both, or neither. */
export type ImageMode = 'image' | 'text' | 'both' | null;

/** Placement of a tag's image relative to its text. */
export type ImagePosition = 'top' | 'bottom' | 'left' | 'right' | null;

/** Horizontal alignment of a tag's image within its bounding box. */
export type ImageAlign = TextAlign;

/** Vertical alignment of a tag's image within its bounding box. */
export type ImageVAlign = TextVAlign;

/** Tooltip rendering strategy: the browser's native `title` attribute, a floating div, or disabled. */
export type TooltipMode = 'native' | 'div' | null;

/** Restricts free-drag rotation to a single axis, both axes, or none. */
export type LockMode = 'x' | 'y' | 'xy' | null;

/**
 * Easing function used to shape animation progress.
 *
 * @param t - elapsed progress normalized to the 0..1 range
 * @returns eased progress, typically also within 0..1
 */
export type EasingFunction = (t: number) => number;

/** Named built-in easing curve, or a custom {@link EasingFunction}. */
export type AnimTiming = 'smooth' | 'linear' | EasingFunction;

/**
 * Custom drawing hook invoked to render extra content at the center of the cloud
 * (e.g. behind the frontmost tag).
 *
 * @param ctx - target canvas 2D context
 * @param width - canvas width in pixels
 * @param height - canvas height in pixels
 * @param centerX - x coordinate of the cloud's center on the canvas
 * @param centerY - y coordinate of the cloud's center on the canvas
 */
export type CenterFunc = (
	ctx: CanvasRenderingContext2D, width: number, height: number, centerX: number, centerY: number,
) => void;

/** Maps weight thresholds to colors, used to interpolate a tag's weighted color. */
export type WeightGradient = Record<number, string>;

/** A 2D `[x, y]` offset or size pair. */
export type Offset2D = [number, number];

/** Identifies a single tag, by its draw-order index, container index, element id, or exact text. */
export type TagSelector = number | { index: number } | { id: string } | { text: string };

/** Options for animating the cloud's rotation so a chosen tag moves to a given position. */
export interface RotateTagOptions {
	/** Tag to rotate into place. */
	tag: TagSelector;
	/** Target latitude, in degrees. */
	lat: number;
	/** Target longitude, in degrees. */
	lng: number;
	/** Animation duration in milliseconds. Defaults to 500. */
	time?: number;
	/** Whether the tag should be shown in its active (highlighted) state while rotating. */
	active?: boolean;
	/** Invoked once the rotation animation completes. */
	callback?: () => void;
}

/** Options for animating the cloud's rotation so a chosen tag moves to the front. */
export type TagToFrontOptions = Omit<RotateTagOptions, 'lat' | 'lng'>;
