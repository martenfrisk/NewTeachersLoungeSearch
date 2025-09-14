// Standardized transition patterns using Svelte transition API
import { fly, fade, scale, slide } from 'svelte/transition';
import { quintOut, quartOut, cubicOut } from 'svelte/easing';

// Type definitions for transition functions
type TransitionFunction = (
	node: Element,
	params?: Record<string, unknown>
) => {
	duration: number;
	css?: (t: number, u?: number) => string;
	tick?: (t: number, u?: number) => void;
};

// Duration constants for consistency
export const DURATION = {
	FAST: 150,
	BASE: 200,
	SLOW: 300,
	SLOWER: 500
} as const;

// Easing presets
export const EASING = {
	SMOOTH: quintOut,
	SNAPPY: quartOut,
	BASE: cubicOut
} as const;

// Standardized transition presets
export const transitions = {
	// Fade transitions
	fadeIn: (node: Element, params?: { duration?: number; delay?: number }) =>
		fade(node, {
			duration: params?.duration ?? DURATION.BASE,
			delay: params?.delay ?? 0,
			easing: EASING.SMOOTH
		}),

	fadeOut: (node: Element, params?: { duration?: number; delay?: number }) =>
		fade(node, {
			duration: params?.duration ?? DURATION.FAST,
			delay: params?.delay ?? 0,
			easing: EASING.SMOOTH
		}),

	// Fly transitions
	slideUp: (node: Element, params?: { duration?: number; distance?: number }) =>
		fly(node, {
			y: params?.distance ?? 20,
			duration: params?.duration ?? DURATION.BASE,
			easing: EASING.SMOOTH
		}),

	slideDown: (node: Element, params?: { duration?: number; distance?: number }) =>
		fly(node, {
			y: -(params?.distance ?? 20),
			duration: params?.duration ?? DURATION.BASE,
			easing: EASING.SMOOTH
		}),

	slideLeft: (node: Element, params?: { duration?: number; distance?: number }) =>
		fly(node, {
			x: params?.distance ?? 100,
			duration: params?.duration ?? DURATION.BASE,
			easing: EASING.SMOOTH
		}),

	slideRight: (node: Element, params?: { duration?: number; distance?: number }) =>
		fly(node, {
			x: -(params?.distance ?? 100),
			duration: params?.duration ?? DURATION.BASE,
			easing: EASING.SMOOTH
		}),

	// Scale transitions
	scaleIn: (node: Element, params?: { duration?: number; start?: number }) =>
		scale(node, {
			start: params?.start ?? 0.95,
			duration: params?.duration ?? DURATION.BASE,
			easing: EASING.SMOOTH
		}),

	popIn: (node: Element, params?: { duration?: number }) =>
		scale(node, {
			start: 0.8,
			duration: params?.duration ?? DURATION.SLOW,
			easing: EASING.SNAPPY
		}),

	// Slide transitions (for panels, dropdowns)
	slidePanel: (node: Element, params?: { duration?: number; delay?: number }) =>
		slide(node, {
			duration: params?.duration ?? DURATION.BASE,
			delay: params?.delay ?? 0,
			easing: EASING.SMOOTH
		}),

	// Context-specific transitions
	modal: (node: Element) =>
		fade(node, {
			duration: DURATION.BASE,
			easing: EASING.SMOOTH
		}),

	dropdown: (node: Element) =>
		fly(node, {
			y: -10,
			duration: DURATION.FAST,
			easing: EASING.SMOOTH
		}),

	tooltip: (node: Element) =>
		scale(node, {
			start: 0.9,
			duration: DURATION.FAST,
			easing: EASING.SMOOTH
		}),

	toast: (node: Element) =>
		fly(node, {
			y: -100,
			duration: DURATION.SLOW,
			easing: EASING.SNAPPY
		}),

	contextMenu: (node: Element) =>
		scale(node, {
			start: 0.95,
			duration: DURATION.FAST,
			easing: EASING.SMOOTH
		}),

	// Loading states
	pulse: (node: Element, params?: { duration?: number }) => {
		// Custom pulse animation
		const duration = params?.duration ?? DURATION.SLOWER;
		return {
			duration,
			css: (t: number) => {
				const opacity = 0.4 + Math.sin(t * Math.PI * 2) * 0.2;
				return `opacity: ${opacity}`;
			}
		};
	}
} as const;

// Higher-order functions for common patterns
export const createStaggered = (transition: TransitionFunction, staggerDelay: number = 50) => {
	let index = 0;
	return (node: Element, params?: Record<string, unknown>) => {
		const delay = index * staggerDelay;
		index++;
		return transition(node, { ...params, delay });
	};
};

// Reset stagger index for new sequences
export const resetStagger = () => {
	// Implementation would need to track stagger indices
};

// Utility for conditional transitions
export const conditionalTransition = <T extends Record<string, unknown>>(
	condition: boolean,
	trueTransition: TransitionFunction,
	falseTransition?: TransitionFunction
) => {
	return (node: Element, params?: T) => {
		if (condition) {
			return trueTransition(node, params);
		}
		if (falseTransition) {
			return falseTransition(node, params);
		}
		// Return no-op transition
		return {
			duration: 0,
			css: () => ''
		};
	};
};

// Presets for specific UI components
export const componentTransitions = {
	searchHit: transitions.slideUp,
	episodeCard: transitions.scaleIn,
	badge: transitions.scaleIn,
	button: transitions.scaleIn,
	loadingSpinner: transitions.fadeIn,
	errorMessage: transitions.slideDown,
	successMessage: transitions.slideUp,
	contextPanel: transitions.slidePanel,
	sidebar: transitions.slideLeft,
	header: transitions.slideDown,
	fadeIn: transitions.fadeIn
} as const;
