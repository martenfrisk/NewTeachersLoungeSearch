/**
 * Focus management utilities for editor components
 * Provides consistent and accessible focus handling to replace autofocus patterns
 */

/**
 * Svelte action for managing focus on mount
 * Provides better control than the native autofocus attribute
 */
export function focusOnMount(
	element: HTMLElement,
	options: {
		delay?: number;
		select?: boolean;
	} = {}
) {
	const { delay = 0, select = false } = options;

	let timeoutId: NodeJS.Timeout | null = null;

	// Use timeout to ensure DOM is ready and avoid race conditions
	timeoutId = setTimeout(() => {
		try {
			element.focus();

			// If it's an input/textarea and select is true, select all text
			if (
				select &&
				(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
			) {
				element.select();
			}
		} catch (error) {
			// Fail silently - element might not be focusable
			console.debug('Focus failed:', error);
		}
	}, delay);

	return {
		destroy() {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	};
}

/**
 * Svelte action for managing focus when a condition becomes true
 * Useful for conditional focusing based on reactive state
 */
export function focusWhen(
	element: HTMLElement,
	condition: boolean,
	options: {
		delay?: number;
		select?: boolean;
	} = {}
) {
	const { delay = 0, select = false } = options;

	let timeoutId: NodeJS.Timeout | null = null;

	if (condition) {
		timeoutId = setTimeout(() => {
			try {
				element.focus();

				if (
					select &&
					(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
				) {
					element.select();
				}
			} catch (error) {
				console.debug('Focus failed:', error);
			}
		}, delay);
	}

	return {
		update(newCondition: boolean) {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}

			if (newCondition) {
				timeoutId = setTimeout(() => {
					try {
						element.focus();

						if (
							select &&
							(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
						) {
							element.select();
						}
					} catch (error) {
						console.debug('Focus failed:', error);
					}
				}, delay);
			}
		},
		destroy() {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		}
	};
}

/**
 * Focus trap for modal-like components
 * Traps focus within a container element
 */
export function focusTrap(element: HTMLElement) {
	const focusableElements = element.querySelectorAll(
		'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
	) as NodeListOf<HTMLElement>;

	const firstFocusableElement = focusableElements[0];
	const lastFocusableElement = focusableElements[focusableElements.length - 1];

	function handleTabKey(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;

		if (e.shiftKey) {
			if (document.activeElement === firstFocusableElement) {
				lastFocusableElement?.focus();
				e.preventDefault();
			}
		} else {
			if (document.activeElement === lastFocusableElement) {
				firstFocusableElement?.focus();
				e.preventDefault();
			}
		}
	}

	element.addEventListener('keydown', handleTabKey);

	// Focus the first element initially
	firstFocusableElement?.focus();

	return {
		destroy() {
			element.removeEventListener('keydown', handleTabKey);
		}
	};
}

/**
 * Utility to check if an element is focusable
 */
export function isFocusable(element: Element): boolean {
	if (element instanceof HTMLElement) {
		// Check if element is disabled
		if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
			return false;
		}

		// Check tabindex
		const tabindex = element.getAttribute('tabindex');
		if (tabindex === '-1') return false;
		if (tabindex && parseInt(tabindex) >= 0) return true;

		// Check if it's a naturally focusable element
		const focusableTags = ['button', 'input', 'select', 'textarea', 'a'];
		if (focusableTags.includes(element.tagName.toLowerCase())) {
			return true;
		}

		// Check if it has href (for links)
		if (element.hasAttribute('href')) return true;
	}

	return false;
}

/**
 * Get the next/previous focusable element in DOM order
 */
export function getNextFocusable(
	current: Element,
	direction: 'next' | 'previous' = 'next'
): HTMLElement | null {
	const focusableElements = Array.from(
		document.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		)
	).filter(isFocusable) as HTMLElement[];

	const currentIndex = focusableElements.indexOf(current as HTMLElement);
	if (currentIndex === -1) return null;

	const nextIndex =
		direction === 'next'
			? (currentIndex + 1) % focusableElements.length
			: (currentIndex - 1 + focusableElements.length) % focusableElements.length;

	return focusableElements[nextIndex];
}
