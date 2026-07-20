import { createCanvas, get2dContext, roundRect, textSet } from '@/render/canvas.js';
import type { CanvasImage } from '@/render/canvas.js';
import type { TextAlign, TextVAlign, ImagePosition, ImageAlign, ImageVAlign, Offset2D } from '@/types.js';

/** Pre-scaled placement details for the optional image, set via {@link TextCanvas.setImage}. */
interface ImageLayout {
  image: CanvasImage;
  /** Image width, already multiplied by the text scale. */
  width: number;
  /** Image height, already multiplied by the text scale. */
  height: number;
  position: ImagePosition;
  /** Gap between image and text, already multiplied by the text scale. */
  padding: number;
  align: ImageAlign;
  valign: ImageVAlign;
}

/**
 * Holds the measured text layout for a tag and composites it (plus background,
 * outline, shadow and an optional image) into a canvas on demand.
 */
export class TextCanvas {
  private readonly strings: string[];
  private readonly font: string;
  private readonly width: number;
  private readonly height: number;
  private readonly maxWidth: number;
  private readonly stringWidths: number[];
  private readonly align: TextAlign;
  private readonly valign: TextVAlign;
  private readonly scale: number;
  private imageLayout: ImageLayout | null = null;

  /**
   * @param strings - the text lines
   * @param font - CSS font shorthand used to render the text
   * @param width - measured text block width (unscaled logical pixels)
   * @param height - measured text block height (unscaled logical pixels)
   * @param maxWidth - width the lines are aligned within
   * @param stringWidths - measured width of each line, for alignment
   * @param align - horizontal text alignment
   * @param valign - vertical alignment used when placing an image alongside text
   * @param scale - render scale (`txtScale`) applied to image sizes and padding
   */
  constructor(
    strings: string[],
    font: string,
    width: number,
    height: number,
    maxWidth: number,
    stringWidths: number[],
    align: TextAlign,
    valign: TextVAlign,
    scale: number,
  ) {
    this.strings = strings;
    this.font = font;
    this.width = width;
    this.height = height;
    this.maxWidth = maxWidth;
    this.stringWidths = stringWidths;
    this.align = align;
    this.valign = valign;
    this.scale = scale;
  }

  /**
   * Attaches an image to be composited alongside the text.
   *
   * Ported from `SetImage` (tagcanvas.js). `width`, `height` and
   * `padding` are stored pre-multiplied by the text scale, matching the
   * original.
   *
   * @param image - the image to draw
   * @param width - image width at scale 1
   * @param height - image height at scale 1
   * @param position - where the image sits relative to the text
   * @param padding - gap between image and text (at scale 1)
   * @param align - horizontal image alignment
   * @param valign - vertical image alignment
   * @param _scale - the image's own scale (stored by the original as `iscale`
   *   but never read; accepted for signature parity)
   */
  setImage(
    image: CanvasImage,
    width: number,
    height: number,
    position: ImagePosition,
    padding: number,
    align: ImageAlign,
    valign: ImageVAlign,
    _scale: number,
  ): void {
    this.imageLayout = {
      image,
      width: width * this.scale,
      height: height * this.scale,
      position,
      padding: padding * this.scale,
      align,
      valign,
    };
  }

  /**
   * Composites text, background, outline, shadow and any attached image into a
   * new canvas.
   *
   * Ported from `Create` (tagcanvas.js). The text is drawn without
   * `textSet`'s own shadow support (which would reserve extra space); instead,
   * when a shadow is required the content is drawn to a transparent canvas and
   * re-drawn with the shadow applied, exactly as in the original.
   *
   * @param color - text fill color
   * @param bgColor - background fill color, or `null` for no background
   * @param bgOutline - background outline color
   * @param bgOutlineThickness - outline thickness; `0` disables the outline
   * @param shadowColor - shadow color, or `null`
   * @param shadowBlur - shadow blur radius
   * @param shadowOffsets - `[offsetX, offsetY]` shadow offset
   * @param padding - padding around the content
   * @param radius - background corner radius
   * @returns the composited canvas
   */
  create(
    color: string,
    bgColor: string | null,
    bgOutline: string,
    bgOutlineThickness: number,
    shadowColor: string | null,
    shadowBlur: number,
    shadowOffsets: Offset2D,
    padding: number,
    radius: number,
  ): HTMLCanvasElement {
    const sox = Math.abs(shadowOffsets[0]);
    const soy = Math.abs(shadowOffsets[1]);
    const pad = Math.max(padding, sox + shadowBlur, soy + shadowBlur);
    // `edge` is the doubled border allowance (both sides); reused below as the
    // half-thickness stroke inset, matching the original's `x1`/`y1` reuse.
    let edge = 2 * (pad + bgOutlineThickness);
    let cw = this.width + edge;
    let ch = this.height + edge;
    let offx = pad + bgOutlineThickness;
    let offy = pad + bgOutlineThickness;

    const layout = this.imageLayout;
    let ix = 0;
    let iy = 0;
    let iw = 0;
    let ih = 0;
    if (layout) {
      ix = pad + bgOutlineThickness;
      iy = pad + bgOutlineThickness;
      iw = layout.width;
      ih = layout.height;
      if (layout.position === 'top' || layout.position === 'bottom') {
        if (iw < this.width) {
          ix += this.alignOffset(iw, this.width, layout.align);
        } else {
          offx += this.alignOffset(this.width, iw, this.align);
        }
        if (layout.position === 'top') {
          offy += ih + layout.padding;
        } else {
          iy += this.height + layout.padding;
        }
        cw = Math.max(cw, iw + edge);
        ch += ih + layout.padding;
      } else {
        if (ih < this.height) {
          iy += this.alignOffset(ih, this.height, layout.valign);
        } else {
          offy += this.alignOffset(this.height, ih, this.valign);
        }
        if (layout.position === 'right') {
          ix += this.width + layout.padding;
        } else {
          offx += iw + layout.padding;
        }
        cw += iw + layout.padding;
        ch = Math.max(ch, ih + edge);
      }
    }

    const canvas = createCanvas(cw, ch);
    edge = bgOutlineThickness / 2;
    const x2 = cw - bgOutlineThickness;
    const y2 = ch - bgOutlineThickness;
    const rr = Math.min(radius, x2 / 2, y2 / 2);
    let context = get2dContext(canvas);
    if (bgColor) {
      context.fillStyle = bgColor;
      roundRect(context, edge, edge, x2, y2, rr);
    }
    if (bgOutlineThickness) {
      context.strokeStyle = bgOutline;
      context.lineWidth = bgOutlineThickness;
      roundRect(context, edge, edge, x2, y2, rr, true);
    }

    let shadowContext: CanvasRenderingContext2D | null = null;
    let shadowCanvas: HTMLCanvasElement | null = null;
    if (shadowBlur || sox || soy) {
      // draw the content on a transparent canvas, then shadow it in one pass
      shadowCanvas = createCanvas(cw, ch);
      shadowContext = context;
      context = get2dContext(shadowCanvas);
    }

    // don't use textSet's shadow support because it adds space for the shadow
    textSet(context, this.font, color, this.strings, offx, offy, null, 0, [],
      this.maxWidth, this.stringWidths, this.align);

    if (layout) {
      context.drawImage(layout.image, ix, iy, iw, ih);
    }

    if (shadowContext && shadowCanvas) {
      // draw the text and image with the added shadow
      context = shadowContext;
      if (shadowColor) {
        context.shadowColor = shadowColor;
      }
      if (shadowBlur) {
        context.shadowBlur = shadowBlur;
      }
      context.shadowOffsetX = shadowOffsets[0];
      context.shadowOffsetY = shadowOffsets[1];
      context.drawImage(shadowCanvas, 0, 0);
    }
    return canvas;
  }

  /**
   * Computes the offset that positions content of `size` within `space` for a
   * given alignment (right/bottom → end, left/top → start, otherwise centered).
   *
   * Ported from `Align` (tagcanvas.js).
   */
  private alignOffset(size: number, space: number, a: TextAlign | TextVAlign): number {
    if (a === 'right' || a === 'bottom') {
      return space - size;
    }
    if (a !== 'left' && a !== 'top') {
      return (space - size) / 2;
    }
    return 0;
  }
}
