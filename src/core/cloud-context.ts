import type { AudioTrack } from '@/platform/audio.js';
import type { ResolvedOptions } from '@/core/options.js';

/**
 * The read-only surface a `Tag`/`Outline` is allowed to use from its owning
 * cloud: resolved options, canvas/context, projection and geometry constants,
 * live pointer position, derived render state, weighting, audio, and
 * lifecycle. `TagCanvas` implements this interface, and `Tag`/`Outline`
 * access all cloud state exclusively through it rather than through the
 * concrete `TagCanvas` class.
 *
 * Members are `readonly` unless the field is genuinely mutated by a child
 * object (see {@link ITagCanvas.txtOptActive}).
 */
export interface ITagCanvas {
  /** All resolved, frozen static options for the cloud. Every option is read through here. */
  readonly opts: ResolvedOptions;
  /** The 2D rendering context of the cloud's canvas. */
  readonly ctxt: CanvasRenderingContext2D;
  /** The cloud's canvas element. */
  readonly canvas: HTMLCanvasElement;

  // --- Perspective / geometry ---

  /**
   * Perspective near-plane distance, `250 / max(depth, 0.001)` (legacy `tc.z1`).
   * Constant for the cloud's lifetime.
   */
  readonly z1: number;
  /**
   * Perspective far-plane distance, `z1 / zoomLevel` (legacy `tc.z2`).
   * **Dynamic** — re-derived whenever the zoom level changes.
   */
  readonly z2: number;
  /**
   * Cloud radius in canvas pixels, `min(canvasWidth, canvasHeight) * 0.0075`
   * (legacy `tc.radius`).
   */
  readonly radius: number;
  /**
   * Reference shape radius used for depth-based brightness falloff (legacy
   * `tc.max_radius`, always `100`).
   */
  readonly maxRadius: number;

  // --- Live pointer position ---

  /**
   * Current pointer X in canvas-internal pixels (legacy `tc.mx`), or `-1` when
   * the pointer is outside the canvas. Read by `Tag.checkActive`.
   */
  readonly mx: number;
  /**
   * Current pointer Y in canvas-internal pixels (legacy `tc.my`), or `-1` when
   * the pointer is outside the canvas. Read by `Tag.checkActive`.
   */
  readonly my: number;

  // --- Derived render state ---

  /**
   * The resolved text shadow color (the browser-normalized value of the
   * `shadow` option), or `null` when no shadow is configured. Replaces the
   * legacy dynamically-`delete`d `tc.shadow` field: `null` is the "no shadow"
   * state the original expressed by deleting the field.
   */
  readonly shadowColor: string | null;
  /**
   * Whether tags currently render as pre-baked bitmaps rather than live text.
   * Replaces the legacy write-back to the `txtOpt` option: `Tag.measure` sets
   * this `true` once it has built a tag's text bitmap, and the cloud's draw
   * loop reads it to decide whether to apply a live shadow.
   *
   * Initialized to `opts.txtOpt`. This is the only member a `Tag` mutates,
   * hence it is not `readonly`.
   */
  txtOptActive: boolean;

  // --- Weighting ---

  /**
   * Per-source minimum tag weight, indexed by weighting pass (legacy
   * `tc.min_weight`). Populated by the cloud's weighting step before
   * `Tag.setWeight` is called.
   */
  readonly minWeight: number[];
  /**
   * Per-source maximum tag weight, indexed by weighting pass (legacy
   * `tc.max_weight`).
   */
  readonly maxWeight: number[];

  // --- Audio ---

  /**
   * Whether audio playback is currently muted for this cloud (legacy
   * `tc.audioOff`; also stands in for the old global `audio === 'off'` disable
   * when `activeAudio === false`).
   */
  readonly audioOff: boolean;
  /**
   * The cloud-level `activeAudio` track played for whichever tag is active
   * (legacy `tc.audio`/`tc.gain`), or `null` when no `activeAudio` is
   * configured. Tags with their own `<audio>` element use their own track
   * instead and never touch this.
   */
  readonly activeAudioTrack: AudioTrack | null;
  /**
   * The **live** playback volume (legacy `tc.audioVolume`). This is a runtime
   * field rather than `opts.audioVolume` because the public `setVolume()`
   * (legacy `Volume`) mutates it, and `opts` is frozen.
   */
  readonly audioVolume: number;

  // --- Lifecycle ---

  /**
   * Whether the cloud has been destroyed. Deferred image-load callbacks (see
   * `Tag.attachImage`) must no-op when this is `true`.
   */
  readonly destroyed: boolean;
  /**
   * Abort signal tying the cloud's deferred image-load listeners to its
   * lifetime, so `destroy()` removes them (replaces the legacy `AddHandler`
   * calls in `AddImage`).
   */
  readonly signal: AbortSignal;

  // --- Weight gradient lookup ---

  /**
   * Resolves a weight-gradient color for a normalized position and gradient
   * row (legacy `FindGradientColour(tc, p, r)`). The cloud owns a
   * `GradientCache` (`render/gradient.ts`) and delegates to it.
   *
   * @param position - normalized weight in `[0, 1]`
   * @param row - gradient index when multiple gradients are configured
   * @returns an `rgba(...)` color string
   */
  gradientColor(position: number, row: number): string;
}
