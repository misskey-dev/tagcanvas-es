/**
 * Recursively flattens an element's inline content into an array of text lines,
 * treating `<br>` as a hard line break, and can further wrap those lines to a
 * width limit.
 */
export class TextSplitter {
	/** The element whose contents are split. */
	readonly e: HTMLElement;
	/** The element's raw text, as it was at construction time. */
	readonly original: string | null;
	/** The accumulated lines (populated by {@link lines} / {@link splitWidth}). */
	text: string[] = [];
	/** Words gathered for the line currently being built. */
	private line: string[] = [];
	/** Whether the previous node was a `<br>` (so the next text starts a fresh line). */
	private brSeen = false;

	/** @param e - the element to split */
	constructor(e: HTMLElement) {
		this.e = e;
		this.original = e.textContent;
	}

	/**
   * Whether every collected line is empty.
   *
   * Ported from `Empty` (tagcanvas.js).
   */
	empty(): boolean {
		for (let i = 0; i < this.text.length; ++i) {
			if (this.text[i].length) {
				return false;
			}
		}
		return true;
	}

	/**
   * Walks the element (recursing into child elements), splitting text on `<br>`
   * boundaries into {@link text}.
   *
   * Ported from `Lines` (tagcanvas.js).
   *
   * @param node - subtree to walk; omit to walk the root element (`this.e`)
   * @returns the accumulated lines
   */
	lines(node?: Node): string[] {
		const recursing = node !== undefined;
		const el = node ?? this.e;
		const children = el.childNodes;
		for (let i = 0; i < children.length; ++i) {
			const child = children[i];
			if (child.nodeName === 'BR') {
				this.text.push(this.line.join(' '));
				this.brSeen = true;
			} else if (child.nodeType === Node.TEXT_NODE) {
				if (this.brSeen) {
					this.line = [child.nodeValue ?? ''];
					this.brSeen = false;
				} else {
					this.line.push(child.nodeValue ?? '');
				}
			} else {
				this.lines(child);
			}
		}
		if (!recursing && !this.brSeen) {
			this.text.push(this.line.join(' '));
		}
		return this.text;
	}

	/**
   * Re-wraps the already-split lines so none exceeds `width` pixels when
   * measured in the given font, breaking only on whitespace.
   *
   * Ported from `SplitWidth` (tagcanvas.js).
   *
   * @param width - maximum line width in pixels
   * @param context - a 2D context used only for text measurement
   * @param font - font family (a `"<height>px "` prefix is added)
   * @param height - text height in pixels
   * @returns the re-wrapped lines (also stored on {@link text})
   */
	splitWidth(width: number, context: CanvasRenderingContext2D, font: string, height: number): string[] {
		const result: string[] = [];
		context.font = height + 'px ' + font;
		for (let i = 0; i < this.text.length; ++i) {
			const words = this.text[i].split(/\s+/);
			this.line = [words[0]];
			for (let j = 1; j < words.length; ++j) {
				if (context.measureText(this.line.join(' ') + ' ' + words[j]).width > width) {
					result.push(this.line.join(' '));
					this.line = [words[j]];
				} else {
					this.line.push(words[j]);
				}
			}
			result.push(this.line.join(' '));
		}
		this.text = result;
		return this.text;
	}
}
