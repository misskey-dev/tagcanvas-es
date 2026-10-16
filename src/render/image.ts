import { createCanvas, get2dContext, roundRect, textSet } from '@/render/canvas.js';
import type { CanvasImage } from '@/render/canvas.js';
import type { Offset2D } from '@/types.js';

/**
 * A composited image together with its logical (unscaled, z=0) dimensions.
 *
 * The returned `width`/`height` are the canvas size divided back out by the
 * scale factor, so callers can position the image as if it were unscaled.
 */
export interface SizedImage {
	/** The composited canvas. */
	image: CanvasImage;
	/** Logical width at z=0 (canvas width ÷ scale). */
	width: number;
	/** Logical height at z=0 (canvas height ÷ scale). */
	height: number;
}

/** Axis-aligned bounding box of rendered text, in canvas pixels. */
export interface TextBoundingBox {
	/** Top-left corner of the inked region. */
	min: { x: number; y: number };
	/** Bottom-right corner of the inked region. */
	max: { x: number; y: number };
}

/**
 * Draws an image centered on a new, larger canvas without scaling it.
 *
 * Ported from `ExpandImage` (tagcanvas.js).
 *
 * @param image - source image
 * @param width - target canvas width
 * @param height - target canvas height
 */
export function expandImage(image: CanvasImage, width: number, height: number): HTMLCanvasElement {
	const canvas = createCanvas(width, height);
	const context = get2dContext(canvas);
	context.drawImage(image, (width - image.width) / 2, (height - image.height) / 2);
	return canvas;
}

/**
 * Draws an image scaled to fill a new canvas.
 *
 * Ported from `ScaleImage` (tagcanvas.js).
 *
 * @param image - source image
 * @param width - target canvas width
 * @param height - target canvas height
 */
export function scaleImage(image: CanvasImage, width: number, height: number): HTMLCanvasElement {
	const canvas = createCanvas(width, height);
	const context = get2dContext(canvas);
	context.drawImage(image, 0, 0, width, height);
	return canvas;
}

/**
 * Composites an image onto a rounded background with an optional outline.
 *
 * Ported from `AddBackgroundToImage` (tagcanvas.js). When
 * `outlineFill` is set, source-in compositing recolors the image (and its
 * border) with `outlineColor` — this is the highlight/outline variant the
 * original built when `outlineMethod === 'colour'`.
 *
 * @param image - source image
 * @param width - image width at scale 1
 * @param height - image height at scale 1
 * @param scale - factor applied to padding, outline thickness and radius
 * @param color - background fill color, or `null` for no fill
 * @param outlineThickness - outline stroke width (before scaling); `0` disables the outline
 * @param outlineColor - outline stroke color, or `null`
 * @param padding - padding around the image (before scaling)
 * @param radius - background corner radius (before scaling)
 * @param outlineFill - when true, recolor the image with `outlineColor` via compositing
 * @returns the composited canvas plus its logical dimensions
 */
export function addBackgroundToImage(
	image: CanvasImage,
	width: number,
	height: number,
	scale: number,
	color: string | null,
	outlineThickness: number,
	outlineColor: string | null,
	padding: number,
	radius: number,
	outlineFill?: boolean,
): SizedImage {
	const canvasWidth = width + ((2 * padding) + outlineThickness) * scale;
	const canvasHeight = height + ((2 * padding) + outlineThickness) * scale;
	const canvas = createCanvas(canvasWidth, canvasHeight);
	const thickness = outlineThickness * scale;
	const scaledRadius = radius * scale;
	const x1 = thickness / 2;
	const y1 = thickness / 2;
	const x2 = canvasWidth - thickness;
	const y2 = canvasHeight - thickness;
	const inset = (padding * scale) + x1; // leave room for the outline
	const context = get2dContext(canvas);
	const rr = Math.min(scaledRadius, x2 / 2, y2 / 2);
	if (color) {
		context.fillStyle = color;
		roundRect(context, x1, y1, x2, y2, rr);
	}
	if (thickness) {
		context.strokeStyle = outlineColor ?? '';
		context.lineWidth = thickness;
		roundRect(context, x1, y1, x2, y2, rr, true);
	}

	if (outlineFill) {
		// use compositing to color in the image and border
		const overlay = createCanvas(canvasWidth, canvasHeight);
		const overlayContext = get2dContext(overlay);
		overlayContext.drawImage(image, inset, inset, width, height);
		overlayContext.globalCompositeOperation = 'source-in';
		overlayContext.fillStyle = outlineColor ?? '';
		overlayContext.fillRect(0, 0, canvasWidth, canvasHeight);
		overlayContext.globalCompositeOperation = 'destination-over';
		overlayContext.drawImage(canvas, 0, 0);
		overlayContext.globalCompositeOperation = 'source-over';
		context.drawImage(overlay, 0, 0);
	} else {
		context.drawImage(image, inset, inset, image.width, image.height);
	}
	return { image: canvas, width: canvasWidth / scale, height: canvasHeight / scale };
}

/**
 * Rounds off the corners of an image (or clips it to a circle when the radius
 * is large enough).
 *
 * Ported from `RoundImage` (tagcanvas.js). The `radius` retains the
 * original's dual interpretation: a `'%'` suffix expresses the radius as a
 * percentage of the image's larger dimension, otherwise it is a scaled pixel
 * value.
 *
 * @param image - source image
 * @param radius - corner radius, either a number of pixels or a percentage string like `'50%'`
 * @param iwidth - output width
 * @param iheight - output height
 * @param scale - factor applied to a pixel radius
 */
export function roundImage(
	image: CanvasImage,
	radius: number | string,
	iwidth: number,
	iheight: number,
	scale: number,
): HTMLCanvasElement {
	const radiusStr = String(radius);
	let r1 = parseFloat(radiusStr);
	const longEdge = Math.max(iwidth, iheight);
	const canvas = createCanvas(iwidth, iheight);
	if (radiusStr.indexOf('%') > 0) {
		r1 = (longEdge * r1) / 100;
	} else {
		r1 = r1 * scale;
	}
	const context = get2dContext(canvas);
	context.globalCompositeOperation = 'source-over';
	context.fillStyle = '#fff';
	if (r1 >= longEdge / 2) {
		r1 = Math.min(iwidth, iheight) / 2;
		context.beginPath();
		context.moveTo(iwidth / 2, iheight / 2);
		context.arc(iwidth / 2, iheight / 2, r1, 0, 2 * Math.PI, false);
		context.fill();
		context.closePath();
	} else {
		r1 = Math.min(iwidth / 2, iheight / 2, r1);
		roundRect(context, 0, 0, iwidth, iheight, r1, true);
		context.fill();
	}
	context.globalCompositeOperation = 'source-in';
	context.drawImage(image, 0, 0, iwidth, iheight);
	return canvas;
}

/**
 * Composites an image together with its drop shadow onto a new canvas.
 *
 * Ported from `AddShadowToImage` (tagcanvas.js).
 *
 * @param image - source image
 * @param width - image width at scale 1
 * @param height - image height at scale 1
 * @param scale - factor applied to the shadow blur and offset
 * @param shadowColor - shadow color, or `null`
 * @param shadowBlur - shadow blur radius (before scaling)
 * @param shadowOffset - `[offsetX, offsetY]` shadow offset (before scaling)
 * @returns the composited canvas plus its logical dimensions
 */
export function addShadowToImage(
	image: CanvasImage,
	width: number,
	height: number,
	scale: number,
	shadowColor: string | null,
	shadowBlur: number,
	shadowOffset: Offset2D,
): SizedImage {
	const sw = Math.abs(shadowOffset[0]);
	const sh = Math.abs(shadowOffset[1]);
	const canvasWidth = width + (sw > shadowBlur ? sw + shadowBlur : shadowBlur * 2) * scale;
	const canvasHeight = height + (sh > shadowBlur ? sh + shadowBlur : shadowBlur * 2) * scale;
	const xo = scale * ((shadowBlur || 0) + (shadowOffset[0] < 0 ? sw : 0));
	const yo = scale * ((shadowBlur || 0) + (shadowOffset[1] < 0 ? sh : 0));
	const canvas = createCanvas(canvasWidth, canvasHeight);
	const context = get2dContext(canvas);
	if (shadowColor) {
		context.shadowColor = shadowColor;
	}
	if (shadowBlur) {
		context.shadowBlur = shadowBlur * scale;
	}
	context.shadowOffsetX = shadowOffset[0] * scale;
	context.shadowOffsetY = shadowOffset[1] * scale;
	context.drawImage(image, xo, yo, width, height);
	return { image: canvas, width: canvasWidth / scale, height: canvasHeight / scale };
}

/**
 * Measures the bounding box of rendered text by drawing it white-on-black and
 * scanning the pixels for ink.
 *
 * Ported from `FindTextBoundingBox` (tagcanvas.js). The device-pixel
 * correction at the end is kept exactly as in the original, including its
 * use of the horizontal scale factor for the vertical axis.
 *
 * @param strings - text lines to measure
 * @param font - font family (a pixel size derived from `textHeight` is prepended)
 * @param textHeight - nominal text height in pixels
 * @returns the inked bounding box
 */
export function findTextBoundingBox(strings: string[], font: string, textHeight: number): TextBoundingBox {
	const w = parseInt(String(strings.toString().length * textHeight), 10);
	const h = parseInt(String(textHeight * 2 * strings.length), 10);
	const canvas = createCanvas(w, h);
	const context = get2dContext(canvas);
	context.fillStyle = '#000';
	context.fillRect(0, 0, w, h);
	textSet(context, textHeight + 'px ' + font, '#fff', strings, 0, 0, null, 0, []);

	const idata = context.getImageData(0, 0, w, h);
	const w1 = idata.width;
	const h1 = idata.height;
	const ex: TextBoundingBox = {
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
	// device pixels might not be css pixels
	if (w1 !== w) {
		ex.min.x *= (w / w1);
		ex.max.x *= (w / w1);
	}
	if (h1 !== h) {
		ex.min.y *= (w / h1);
		ex.max.y *= (w / h1);
	}

	return ex;
}
