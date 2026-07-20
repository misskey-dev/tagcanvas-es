# `@misskey-dev/tagcanvas-es`

An HTML5 canvas-based 3D tag cloud. This is a modernized TypeScript port of
[TagCanvas](http://www.goat1000.com/tagcanvas.php) by Graham Breach, distributed as an ES
module with complete type definitions.

TagCanvas turns a plain list of links into a rotating 3D cloud drawn on a `<canvas>`. The
links stay in the document, so the cloud degrades when scripting or canvas support is
unavailable.

## Installation

```bash
npm install @misskey-dev/tagcanvas-es
```

## Quick start

Provide a canvas and a container holding the links you want in the cloud:

```html
<canvas id="myCanvas" width="500" height="500">
  <p>Your browser does not support the canvas element.</p>
</canvas>

<div id="tags">
  <ul>
    <li><a href="https://example.com/a">Tag A</a></li>
    <li><a href="https://example.com/b">Tag B</a></li>
    <li><a href="https://example.com/c">Tag C</a></li>
  </ul>
</div>
```

```ts
import { TagCanvas } from '@misskey-dev/tagcanvas-es';

// Pass the canvas element or a selector string, and an options object.
const tc = new TagCanvas('#myCanvas', {
  tagContainer: '#tags',
  textColor: '#fff',
  outlineColor: '#f96',
  maxSpeed: 0.03,
});

// when the component/page goes away:
tc.destroy();
```

When `tagContainer` points at a separate element, that element is hidden once the cloud
starts (`hideTags`), so the markup doubles as the fallback for browsers that can't run the
cloud. The canvas itself is never hidden, so reading tags from the canvas element — the
default when `tagContainer` is `null` — leaves them visible.

## Tag markup

Every `<a>` element inside the container becomes one tag. What ends up on the tag depends
on what the anchor contains:

| Anchor contents | Result |
| --- | --- |
| Text | A text tag. `<br>` splits it into multiple lines. |
| `<img>` | An image tag. The text is ignored unless `imageMode` is `'both'`, which draws both and positions them with `imagePosition`. |
| A second `<img>` | Shown while the tag is hovered, when `altImage` is enabled. |
| `<audio>` | The clip plays while the tag is hovered. |
| `title` attribute | Used as the tooltip when the `tooltip` option is enabled. |

Per-tag appearance can also come from the markup: with `textColor: null` and
`textFont: null` each tag uses its anchor's own computed CSS `color` and `font-family`,
which lets you style individual tags from CSS.

```html
<div id="tags">
  <ul>
    <li><a href="/a" title="A tooltip" style="color: #6cf">Multi<br>line</a></li>
    <li><a href="/b"><img src="/icon.png" alt="Icon"> With image</a></li>
  </ul>
</div>
```

## API

### `new TagCanvas(canvas, options?)`

- `canvas` — an `HTMLCanvasElement`, or a CSS selector string resolving to one.
- `options` — an optional [`TagCanvasOptions`](#options) object.

Throws an `Error` if the canvas can't be found or its 2D context is unavailable, so wrap
the call in `try`/`catch` if you want to hide the canvas on failure.

### Instance methods

| Method | Description |
| --- | --- |
| `pause()` | Stops the animation loop and freezes the cloud. |
| `resume()` | Resumes after `pause()`. |
| `reload()` | Rebuilds the whole tag list from the source markup. |
| `update()` | Reconciles the tag list against the current markup, keeping existing tags in place. Use this when tags are added or removed. |
| `setSpeed([x, y])` | Sets the constant background rotation speed. |
| `setZoom(zoom)` | Sets the zoom level, clamped to `[zoomMin, zoomMax]`. |
| `setVolume(volume)` | Sets audio playback volume. |
| `toggleAudio()` | Toggles audio mute. |
| `rotateTag(options)` | Rotates the cloud so a tag moves to a given `lat`/`lng` (radians). Returns `false` if the tag isn't found. |
| `tagToFront(options)` | Rotates the cloud so a tag moves to the front. Returns `false` if the tag isn't found. |
| `destroy()` | Releases everything: event listeners, the animation loop, the tooltip element and audio nodes. The instance is inert afterwards. |

### Instance properties

| Property | Description |
| --- | --- |
| `canvas` | The canvas element being drawn to. |
| `paused` | Whether the cloud is currently paused. |
| `destroyed` | Whether `destroy()` has been called. |

### Selecting a tag

`rotateTag()` and `tagToFront()` take a `tag` selector, which is a tag index or one of
`{ index }`, `{ id }`, `{ text }`:

```ts
tc.tagToFront({ tag: { text: 'Tag A' }, time: 600, callback: () => console.log('done') });
tc.rotateTag({ tag: 0, lat: 0, lng: Math.PI / 2 });
```

## Options

All options are optional. The read-only `defaultOptions` export holds every default value. The most commonly used ones:

### Source and layout

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tagContainer` | `HTMLElement \| string \| null` | `null` | Where tags are read from. `null` reads `<a>` elements from the canvas itself. |
| `shape` | `TagShape \| ShapePointGenerator` | `'sphere'` | `'sphere'`, `'hcylinder'`, `'vcylinder'`, `'hring'`, `'vring'`, or your own point generator. |
| `shapeArgs` | `number[]` | `[]` | Extra numeric arguments passed to the shape generator. |
| `radiusX` / `radiusY` / `radiusZ` | `number` | `1` | Per-axis radius multipliers. |
| `shuffleTags` | `boolean` | `false` | Randomizes tag order before laying them out. |
| `hideTags` | `boolean` | `true` | Hides the source markup once the cloud starts. |

### Text and images

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `textColor` | `string \| null` | `'#ff99ff'` | Tag color; `null` uses each anchor's CSS color. |
| `textFont` | `string \| null` | `'Helvetica, Arial, sans-serif'` | Font family; `null` uses each anchor's CSS font. |
| `textHeight` | `number` | `15` | Font size in pixels. |
| `imageMode` | `ImageMode` | `null` | How tags containing an `<img>` are drawn: `'image'`, `'text'`, `'both'`, or `null` to draw the image alone. |
| `imagePosition` | `ImagePosition` | `null` | Image placement relative to the text, or `null` to overlay them. |
| `splitWidth` | `number` | `0` | Wraps tag text beyond this width. `0` disables wrapping. |

### Motion

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxSpeed` | `number` | `0.05` | Maximum rotation speed. |
| `initial` | `[number, number] \| null` | `null` | Initial rotation speed, applied before any interaction. |
| `decel` | `number` | `0.95` | Deceleration rate after the pointer leaves. |
| `lock` | `LockMode` | `null` | Restricts rotation to an axis: `'x'`, `'y'`, `'xy'`. |
| `dragControl` | `boolean` | `false` | Rotate by dragging instead of by pointer position. |
| `depth` | `number` | `0.5` | Perspective strength, 0 to 1. |
| `fadeIn` | `number` | `0` | Fade-in duration in milliseconds. |

### Highlighting

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `outlineMethod` | `OutlineMethod` | `'outline'` | `'outline'`, `'classic'`, `'block'`, `'color'`, `'size'`, `'none'`. |
| `outlineColor` | `string` | `'#ffff99'` | Highlight color. Also accepts `'tag'` / `'tagbg'` to derive it from the tag. |
| `outlineThickness` | `number` | `2` | Outline width in pixels. |
| `freezeActive` | `boolean` | `false` | Stops rotation while a tag is highlighted. |
| `tooltip` | `TooltipMode` | `null` | `'native'` uses the canvas `title`, `'div'` renders a styled element. |

### Zoom and interaction

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `wheelZoom` | `boolean` | `true` | Enables mouse-wheel zooming. |
| `zoomMin` / `zoomMax` | `number` | `0.3` / `3` | Zoom limits. |
| `pinchZoom` | `boolean` | `false` | Enables two-finger pinch zooming. |
| `clickToFront` | `number \| false` | `false` | Rotates a clicked tag to the front over this many milliseconds. |
| `noMouse` | `boolean` | `false` | Disables all pointer interaction. |

### Weighted tags

Set `weight: true` to size or color tags by a weight value, read from the attribute named
by `weightFrom` (or from each anchor's font size when it's `null`). `weightMode` selects
what the weight affects — `'size'`, `'color'`, `'bgcolor'`, `'bgoutline'`, `'outline'` or
`'both'` — and `weightGradient` supplies the color ramp.

```ts
new TagCanvas('#myCanvas', {
  tagContainer: '#tags',
  weight: true,
  weightFrom: 'data-weight',
  weightMode: 'both',
  weightGradient: { 0: '#f00', 0.5: '#ff0', 1: '#0f0' },
});
```

### Audio

Tags can make sound in two ways: an `<audio>` element inside an anchor plays while that tag
is hovered, and `activeAudio` names a single clip played whenever any tag becomes active.
`audioVolume` sets the level, `setVolume()` changes it at runtime, and `audioIcon` draws a
mute toggle on the canvas that `toggleAudio()` also controls. Set `activeAudio: false` to
disable audio for the instance entirely.

Browsers block audio until the user interacts with the page, so playback starts from the
first click regardless of when the cloud was created.

### Center graphics

`centerImage` draws an image at the middle of the cloud, behind the front-most tags. For
full control, `centerFunc` receives the 2D context and is called at the same point each
frame:

```ts
new TagCanvas('#myCanvas', {
  tagContainer: '#tags',
  centerFunc: (ctx, width, height, centerX, centerY) => {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.min(width, height) / 8, 0, Math.PI * 2);
    ctx.fill();
  },
});
```

## Custom shapes

`shape` accepts a generator returning one `[x, y, z]` triple per tag. Extra numbers from
`shapeArgs` are passed after the radii:

```ts
import { TagCanvas, type ShapePointGenerator } from '@misskey-dev/tagcanvas-es';

const spiral: ShapePointGenerator = (count, rx, ry, rz, turns = 3) =>
  Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const angle = t * Math.PI * 2 * turns;
    return [Math.cos(angle) * rx, (t * 2 - 1) * ry, Math.sin(angle) * rz];
  });

new TagCanvas('#myCanvas', { tagContainer: '#tags', shape: spiral, shapeArgs: [4] });
```

## TypeScript

`TagCanvas` is exported both as a named and the default export. Every public type is
exported as well:

```ts
import TagCanvas, {
  defaultOptions,
  type TagCanvasOptions,
  type TagShape,
  type OutlineMethod,
} from '@misskey-dev/tagcanvas-es';
```

## Development

```bash
pnpm install
pnpm dev        # playground at http://localhost:5173
pnpm typecheck
pnpm build
```

`index.html` and `src/playground.ts` are a working example covering shape switching,
`destroy()`/re-creation, tooltips, per-tag colors and multi-line tags.

<details>
<summary><strong>Changes from the original TagCanvas</strong></summary>

This is a TypeScript port of the TagCanvas (v2.11), with a few
intentional breaking changes:

- **Class-based API**: `new TagCanvas(canvas, options)` replaces the old static
  `TagCanvas.Start`/`Pause`/`Delete`/... registry API. Instance methods (`pause()`,
  `resume()`, `reload()`, `update()`, `setSpeed()`, `setZoom()`, `setVolume()`,
  `toggleAudio()`, `rotateTag()`, `tagToFront()`, `destroy()`) replace them.
- **American spelling for options and values**: `textColor`, `outlineColor`, `bgColor`,
  `centerFunc`, `centerImage`, and the `'center'` alignment value replace
  `textColour`/`outlineColour`/`bgColour`/`centreFunc`/`centreImage`/`'centre'`. There are
  no spelling aliases. This change was made to align with the normal HTML/CSS/JS spelling
  conventions, and to avoid confusion with the British spelling of "color" in CSS.
- **Tags come from an option, not a second argument**: `tagContainer` replaces the old
  second constructor parameter, and accepts an element or a CSS selector.
- **`z1`, `z2`, `z0`, and `interval` are gone.** These were either dead constructor
  overrides or an internal timing knob with buggy global-sharing semantics in the
  original; rotation speed now uses a fixed internal time scale with equivalent feel.
- **`shapeArgs` replaces string-parsed shape arguments**: pass
  `{ shape: 'sphere', shapeArgs: [0.5] }` instead of `'sphere(0.5)'`. Custom shapes are
  passed as functions rather than looked up by name on `window`.
- **`animTiming` takes a normalized easing function** — `(t: number) => number` with `t`
  from 0 to 1 — or the preset names `'smooth'` / `'linear'`.
- **`weightMode` and `weightFrom` take arrays** instead of comma-separated strings.
- **`destroy()` fully releases resources**: it removes all event listeners, cancels the
  animation loop, tears down the tooltip element, disconnects audio, and marks the
  instance inert — safe to call before discarding or replacing an instance.
- **No global default-options override mechanism** (the old writable `TagCanvas.options`);
  pass options directly to the constructor. The exported `defaultOptions` is read-only;
  use it to create a new options object with your own overrides.
- **Legacy browser support removed**: the excanvas/VML fallback, `attachEvent`,
  `currentStyle`, prefixed audio and wheel events, and the IE-specific drawing paths are
  all gone. A modern browser with `<canvas>` support is required.
- The jQuery plugin build is not part of this package.

</details>

## License

GNU Lesser General Public License v3.0 or later (inherited from the original TagCanvas library).

Original TagCanvas is by Graham Breach — see
[goat1000.com/tagcanvas.php](http://www.goat1000.com/tagcanvas.php) for the original
library, its documentation and examples.
