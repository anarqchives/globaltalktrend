import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1440px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			// Semantic colors
  			critical: {
  				DEFAULT: 'hsl(var(--color-critical))',
  				bg: 'hsl(var(--color-critical-bg))',
  			},
  			high: {
  				DEFAULT: 'hsl(var(--color-high))',
  				bg: 'hsl(var(--color-high-bg))',
  			},
  			moderate: {
  				DEFAULT: 'hsl(var(--color-moderate))',
  				bg: 'hsl(var(--color-moderate-bg))',
  			},
  			positive: {
  				DEFAULT: 'hsl(var(--color-positive))',
  				bg: 'hsl(var(--color-positive-bg))',
  			},
  		},
  		spacing: {
  			'sp-1': 'var(--space-1)',
  			'sp-2': 'var(--space-2)',
  			'sp-3': 'var(--space-3)',
  			'sp-4': 'var(--space-4)',
  			'sp-6': 'var(--space-6)',
  			'sp-8': 'var(--space-8)',
  			'sp-12': 'var(--space-12)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'shimmer': {
  				'100%': { transform: 'translateX(100%)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		},
  		fontFamily: {
  			sans: [
  				'"Helvetica Neue"',
  				'Helvetica',
  				'Arial',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'sans-serif',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Noto Color Emoji'
  			],
  			serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
  		},
  		fontSize: {
  			'hero': ['28px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.5px' }],
  			'title': ['15px', { lineHeight: '1.3', fontWeight: '600' }],
  			'body': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
  			'caption': ['11px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.3px' }],
  			'micro': ['10px', { lineHeight: '1.3', fontWeight: '500' }],
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
