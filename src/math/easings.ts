import type { EasingFunction } from '@/types.js';

/**
 * Built-in easing curves.
 */
export const easings: { smooth: EasingFunction; linear: EasingFunction } = {
	smooth: (t: number): number => 0.5 - Math.cos(t * Math.PI) / 2,
	linear: (t: number): number => t,
};
