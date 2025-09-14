// Accessibility utilities and patterns for consistent a11y implementation

// ARIA live region announcer for dynamic content changes
export class LiveRegionAnnouncer {
	private politeRegion: HTMLElement | null = null;
	private assertiveRegion: HTMLElement | null = null;

	constructor() {
		this.createRegions();
	}

	private createRegions() {
		if (typeof window === 'undefined') return;

		// Polite announcements (non-interrupting)
		this.politeRegion = document.createElement('div');
		this.politeRegion.setAttribute('aria-live', 'polite');
		this.politeRegion.setAttribute('aria-atomic', 'true');
		this.politeRegion.className = 'sr-only';
		document.body.appendChild(this.politeRegion);

		// Assertive announcements (interrupting)
		this.assertiveRegion = document.createElement('div');
		this.assertiveRegion.setAttribute('aria-live', 'assertive');
		this.assertiveRegion.setAttribute('aria-atomic', 'true');
		this.assertiveRegion.className = 'sr-only';
		document.body.appendChild(this.assertiveRegion);
	}

	announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
		const region = priority === 'polite' ? this.politeRegion : this.assertiveRegion;
		if (region) {
			region.textContent = message;
			// Clear after announcement to allow repeated messages
			setTimeout(() => {
				if (region) region.textContent = '';
			}, 1000);
		}
	}
}

// Global announcer instance
export const announcer = new LiveRegionAnnouncer();

// Focus management utilities
export const focusManagement = {
	// Trap focus within an element
	trapFocus(element: HTMLElement): () => void {
		const focusableElements = element.querySelectorAll(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) as NodeListOf<HTMLElement>;

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		function handleTabKey(e: KeyboardEvent) {
			if (e.key !== 'Tab') return;

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					lastElement.focus();
					e.preventDefault();
				}
			} else {
				if (document.activeElement === lastElement) {
					firstElement.focus();
					e.preventDefault();
				}
			}
		}

		element.addEventListener('keydown', handleTabKey);

		// Focus first element initially
		firstElement?.focus();

		// Return cleanup function
		return () => {
			element.removeEventListener('keydown', handleTabKey);
		};
	},

	// Save and restore focus
	saveFocus(): () => void {
		const previouslyFocused = document.activeElement as HTMLElement;
		return () => {
			if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
				previouslyFocused.focus();
			}
		};
	},

	// Move focus to element with announcement
	moveFocusTo(element: HTMLElement | null, announcement?: string) {
		if (element) {
			element.focus();
			if (announcement) {
				announcer.announce(announcement);
			}
		}
	}
};

// Keyboard navigation patterns
export const keyboardNavigation = {
	// Arrow key navigation for lists/grids
	handleArrowKeys(
		event: KeyboardEvent,
		items: HTMLElement[],
		currentIndex: number,
		options: {
			loop?: boolean;
			orientation?: 'horizontal' | 'vertical' | 'both';
			onIndexChange: (newIndex: number) => void;
		}
	) {
		const { loop = true, orientation = 'vertical', onIndexChange } = options;

		let newIndex = currentIndex;

		switch (event.key) {
			case 'ArrowUp':
				if (orientation === 'vertical' || orientation === 'both') {
					newIndex = currentIndex > 0 ? currentIndex - 1 : loop ? items.length - 1 : 0;
					event.preventDefault();
				}
				break;
			case 'ArrowDown':
				if (orientation === 'vertical' || orientation === 'both') {
					newIndex =
						currentIndex < items.length - 1 ? currentIndex + 1 : loop ? 0 : items.length - 1;
					event.preventDefault();
				}
				break;
			case 'ArrowLeft':
				if (orientation === 'horizontal' || orientation === 'both') {
					newIndex = currentIndex > 0 ? currentIndex - 1 : loop ? items.length - 1 : 0;
					event.preventDefault();
				}
				break;
			case 'ArrowRight':
				if (orientation === 'horizontal' || orientation === 'both') {
					newIndex =
						currentIndex < items.length - 1 ? currentIndex + 1 : loop ? 0 : items.length - 1;
					event.preventDefault();
				}
				break;
			case 'Home':
				newIndex = 0;
				event.preventDefault();
				break;
			case 'End':
				newIndex = items.length - 1;
				event.preventDefault();
				break;
		}

		if (newIndex !== currentIndex) {
			onIndexChange(newIndex);
			items[newIndex]?.focus();
		}
	}
};

// Common accessibility attributes
export const ariaAttributes = {
	// Generate unique IDs for aria-labelledby/describedby
	generateId: (prefix: string = 'a11y') => `${prefix}-${Math.random().toString(36).slice(2, 11)}`,

	// Button states
	button: {
		expanded: (isExpanded: boolean) => ({
			'aria-expanded': isExpanded
		}),
		pressed: (isPressed: boolean) => ({
			'aria-pressed': isPressed
		}),
		disabled: (isDisabled: boolean) => ({
			'aria-disabled': isDisabled,
			...(isDisabled && { tabindex: -1 })
		})
	},

	// List items
	listItem: (position: number, total: number) => ({
		'aria-setsize': total.toString(),
		'aria-posinset': position.toString()
	}),

	// Loading states
	loading: (isLoading: boolean, label: string = 'Loading') => ({
		'aria-busy': isLoading,
		'aria-label': isLoading ? label : undefined
	}),

	// Required fields
	required: (isRequired: boolean) => ({
		'aria-required': isRequired,
		required: isRequired
	})
};

// Screen reader utilities
export const screenReader = {
	// Hide decorative content from screen readers
	decorative: () => ({
		'aria-hidden': 'true'
	}),

	// Label for screen readers only
	labelOnly: (label: string) => ({
		'aria-label': label
	}),

	// Description for screen readers
	describedBy: (id: string) => ({
		'aria-describedby': id
	}),

	// Create visually hidden text
	visuallyHidden: (text: string) => ({
		content: text,
		className: 'sr-only'
	})
};

// Form accessibility helpers
export const formAccessibility = {
	// Error handling
	fieldError: (fieldId: string, errorId: string, hasError: boolean) => ({
		'aria-invalid': hasError,
		'aria-describedby': hasError ? errorId : undefined
	}),

	// Group related fields
	fieldset: (legendText: string) => ({
		role: 'group',
		'aria-labelledby': legendText
	})
};

// Color contrast and visibility utilities
export const visualAccessibility = {
	// Ensure sufficient color contrast (placeholder - would need actual color calculation)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	checkContrast: (_foreground: string, _background: string): boolean => {
		// This is a placeholder - in a real implementation, you'd calculate the contrast ratio
		// and return whether it meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
		return true;
	},

	// High contrast mode detection
	isHighContrastMode: (): boolean => {
		if (typeof window === 'undefined') return false;
		return window.matchMedia('(prefers-contrast: high)').matches;
	},

	// Reduced motion preference
	prefersReducedMotion: (): boolean => {
		if (typeof window === 'undefined') return false;
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}
};

// Utility functions for common patterns
export const a11yUtils = {
	// Create accessible button with loading state
	createAccessibleButton: (
		label: string,
		isLoading: boolean = false,
		isDisabled: boolean = false
	) => {
		const loadingAttrs = ariaAttributes.loading(isLoading, label);
		const disabledAttrs = ariaAttributes.button.disabled(isDisabled);

		return {
			'aria-label': isLoading ? `${label} (loading)` : label,
			...disabledAttrs,
			'aria-busy': loadingAttrs['aria-busy']
		};
	},

	// Create accessible modal
	createAccessibleModal: (titleId: string) => ({
		role: 'dialog',
		'aria-modal': 'true',
		'aria-labelledby': titleId
	}),

	// Create accessible combobox/search
	createAccessibleCombobox: (listId: string, expanded: boolean, activeDescendant?: string) => ({
		role: 'combobox',
		'aria-expanded': expanded,
		'aria-controls': listId,
		'aria-activedescendant': activeDescendant,
		'aria-autocomplete': 'list'
	}),

	// Create accessible tab panel
	createAccessibleTab: (isSelected: boolean, controls: string, labelledBy?: string) => ({
		role: 'tab',
		'aria-selected': isSelected,
		'aria-controls': controls,
		'aria-labelledby': labelledBy,
		tabindex: isSelected ? 0 : -1
	})
};

// Export default object for convenience
export const accessibility = {
	announcer,
	focusManagement,
	keyboardNavigation,
	ariaAttributes,
	screenReader,
	formAccessibility,
	visualAccessibility,
	a11yUtils
};
