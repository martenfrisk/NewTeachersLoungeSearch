// Design tokens for consistent styling across the application
export const designTokens = {
	// Color system
	colors: {
		primary: {
			50: 'rgb(239 246 255)',
			100: 'rgb(219 234 254)',
			500: 'rgb(59 130 246)',
			600: 'rgb(37 99 235)',
			700: 'rgb(29 78 216)',
			800: 'rgb(30 64 175)'
		},
		gray: {
			50: 'rgb(249 250 251)',
			100: 'rgb(243 244 246)',
			200: 'rgb(229 231 235)',
			300: 'rgb(209 213 219)',
			400: 'rgb(156 163 175)',
			500: 'rgb(107 114 128)',
			600: 'rgb(75 85 99)',
			700: 'rgb(55 65 81)',
			800: 'rgb(31 41 55)',
			900: 'rgb(17 24 39)'
		},
		success: {
			50: 'rgb(240 253 244)',
			100: 'rgb(220 252 231)',
			600: 'rgb(22 163 74)',
			700: 'rgb(21 128 61)'
		},
		warning: {
			50: 'rgb(255 251 235)',
			100: 'rgb(254 243 199)',
			600: 'rgb(217 119 6)',
			700: 'rgb(180 83 9)'
		},
		error: {
			50: 'rgb(254 242 242)',
			100: 'rgb(254 226 226)',
			600: 'rgb(220 38 38)',
			700: 'rgb(185 28 28)'
		}
	},

	// Typography scale
	typography: {
		sizes: {
			xs: '0.75rem',
			sm: '0.875rem',
			base: '1rem',
			lg: '1.125rem',
			xl: '1.25rem',
			'2xl': '1.5rem',
			'3xl': '1.875rem'
		},
		weights: {
			normal: '400',
			medium: '500',
			semibold: '600',
			bold: '700'
		},
		leading: {
			tight: '1.25',
			normal: '1.5',
			relaxed: '1.625'
		}
	},

	// Spacing system
	spacing: {
		0: '0',
		1: '0.25rem',
		2: '0.5rem',
		3: '0.75rem',
		4: '1rem',
		5: '1.25rem',
		6: '1.5rem',
		8: '2rem',
		10: '2.5rem',
		12: '3rem',
		16: '4rem',
		20: '5rem',
		24: '6rem'
	},

	// Border radius
	radius: {
		none: '0',
		sm: '0.125rem',
		base: '0.25rem',
		md: '0.375rem',
		lg: '0.5rem',
		xl: '0.75rem',
		full: '9999px'
	},

	// Shadows
	shadows: {
		sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
		base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
		md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
		lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
		xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
	},

	// Transitions
	transitions: {
		fast: '150ms ease-in-out',
		base: '200ms ease-in-out',
		slow: '300ms ease-in-out',
		slower: '500ms ease-in-out'
	},

	// Z-index scale
	zIndex: {
		hide: '-1',
		auto: 'auto',
		base: '0',
		docked: '10',
		dropdown: '20',
		sticky: '30',
		banner: '40',
		overlay: '50',
		modal: '60',
		popover: '70',
		tooltip: '80',
		toast: '90'
	}
} as const;

// Component-specific design patterns
export const componentPatterns = {
	// Button variants
	button: {
		base: 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
		sizes: {
			sm: 'h-8 px-3 text-sm rounded-md',
			md: 'h-10 px-4 py-2 rounded-md',
			lg: 'h-12 px-6 text-lg rounded-lg'
		},
		variants: {
			primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
			secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 active:bg-gray-800',
			outline:
				'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 active:bg-gray-100',
			ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-blue-500 active:bg-gray-200',
			danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800'
		}
	},

	// Input field patterns
	input: {
		base: 'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6',
		error: 'ring-red-300 focus:ring-red-600',
		disabled: 'bg-gray-50 text-gray-500 cursor-not-allowed'
	},

	// Card patterns
	card: {
		base: 'bg-white rounded-lg border border-gray-200 shadow-sm',
		hover: 'hover:shadow-md hover:border-blue-300 transition-all duration-200',
		interactive: 'cursor-pointer transform hover:scale-[1.02] transition-transform duration-200'
	},

	// Badge patterns
	badge: {
		base: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
		variants: {
			primary: 'bg-blue-100 text-blue-800',
			secondary: 'bg-gray-100 text-gray-800',
			success: 'bg-green-100 text-green-800',
			warning: 'bg-yellow-100 text-yellow-800',
			error: 'bg-red-100 text-red-800',
			info: 'bg-blue-50 text-blue-700'
		}
	},

	// Loading states
	loading: {
		spinner: 'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
		pulse: 'animate-pulse bg-gray-200 rounded',
		shimmer:
			'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]'
	}
} as const;

// Animation presets
export const animations = {
	fadeIn: {
		duration: 200,
		easing: 'ease-out',
		css: (t: number) => `opacity: ${t}`
	},
	slideIn: {
		duration: 250,
		easing: 'ease-out',
		css: (t: number, u: number) => `transform: translateY(${u * 20}px); opacity: ${t}`
	},
	scaleIn: {
		duration: 200,
		easing: 'ease-out',
		css: (t: number) => `transform: scale(${0.95 + t * 0.05}); opacity: ${t}`
	},
	slideInRight: {
		duration: 300,
		easing: 'ease-out',
		css: (t: number, u: number) => `transform: translateX(${u * 100}px); opacity: ${t}`
	}
} as const;

// Responsive breakpoints
export const breakpoints = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px'
} as const;

// Helper functions for consistent styling
export const helpers = {
	// Generate consistent focus styles
	focusRing: (color: string = 'blue') =>
		`focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:ring-offset-2`,

	// Generate consistent hover transitions
	hoverTransition: (property: string = 'all') => `transition-${property} duration-200 ease-in-out`,

	// Generate consistent disabled styles
	disabled: () => 'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',

	// Generate consistent truncate styles
	truncate: () => 'truncate overflow-hidden whitespace-nowrap',

	// Generate visually hidden styles for accessibility
	visuallyHidden: () =>
		'sr-only absolute w-px h-px p-0 -m-px overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0'
};
