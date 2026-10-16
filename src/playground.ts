// Dev playground for manually exercising TagCanvas (index.html).
// This file is not included in the production bundle.

import { TagCanvas } from '@/index.js';
import type { LockMode, Offset2D, TagCanvasOptions, TagShape } from '@/index.js';

/** The five built-in shapes, offered as buttons above the cloud. */
const SHAPES: TagShape[] = ['sphere', 'hcylinder', 'vcylinder', 'hring', 'vring'];

/** Per-shape rotation setup taken from goat1000.com demo */
const SHAPE_BEHAVIOR: Record<TagShape, { lock: LockMode; initial: Offset2D }> = {
	sphere: { lock: null, initial: [0.2, 0.2] },
	hcylinder: { lock: 'x', initial: [0, 0.2] },
	vcylinder: { lock: 'y', initial: [0.2, 0] },
	hring: { lock: 'x', initial: [0, 0.2] },
	vring: { lock: 'y', initial: [0.2, 0] },
};

/** Options shared by every shape; `shape`/`lock`/`initial` change between (re)creations. */
const baseOptions: TagCanvasOptions = {
	tagContainer: '#tags',
	textColor: null, // use each <a>'s own CSS color (see the inline `style="color: ..."` tags)
	outlineColor: '#ff9',
	maxSpeed: 0.03,
	depth: 0.8,
	wheelZoom: true,
	tooltip: 'native',
};

const buttonsEl = document.getElementById('buttons');
const canvasEl = document.getElementById('cloud');

let instance: TagCanvas | null = null;
let currentShape: TagShape = 'sphere';

/** Disables the button matching the currently active shape. */
function updateButtons(): void {
	if (!buttonsEl) {
		return;
	}
	for (const btn of buttonsEl.querySelectorAll('button')) {
		btn.disabled = btn.dataset.shape === currentShape;
	}
}

/** Shows a fallback message in place of the canvas after a fatal error. */
function showError(): void {
	const target = document.getElementById('cloud');
	if (!target) {
		return;
	}
	const message = document.createElement('p');
	message.textContent = 'Failed to start TagCanvas. See the console for details.';
	target.replaceWith(message);
}

/**
 * Tears down the current instance (exercising `destroy()`'s resource cleanup on every
 * shape switch) and creates a new one for `shape`.
 */
function start(shape: TagShape): void {
	try {
		instance?.destroy();
		instance = new TagCanvas('#cloud', { ...baseOptions, shape, ...SHAPE_BEHAVIOR[shape] });
		currentShape = shape;
		updateButtons();
	} catch (e) {
		console.error(e);
		instance = null;
		showError();
	}
}

if (buttonsEl) {
	for (const shape of SHAPES) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = shape;
		btn.dataset.shape = shape;
		btn.addEventListener('click', () => start(shape));
		buttonsEl.appendChild(btn);
	}
}

if (canvasEl) {
	start(currentShape);
} else {
	console.error('TagCanvas: #cloud canvas not found in the document.');
	showError();
}
