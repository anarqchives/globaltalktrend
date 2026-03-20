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
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				'6': 'hsl(var(--chart-6))',
  			},
  			warning: {
  				bg: 'hsl(var(--warning-bg))',
  				fg: 'hsl(var(--warning-fg))',
  			},
  			success: {
  				bg: 'hsl(var(--success-bg))',
  				fg: 'hsl(var(--success-fg))',
  			},
  			info: {
  				bg: 'hsl(var(--info-bg))',
  				fg: 'hsl(var(--info-fg))',
  			},
  		},
  		spacing: {
  			'sp-0': 'var(--space-0)',
  			'sp-1': 'var(--space-1)',
  			'sp-2': 'var(--space-2)',
  			'sp-3': 'var(--space-3)',
  			'sp-4': 'var(--space-4)',
  			'sp-5': 'var(--space-5)',
  			'sp-6': 'var(--space-6)',
  			'sp-8': 'var(--space-8)',
  			'sp-10': 'var(--space-10)',
  			'sp-12': 'var(--space-12)',
  			'sp-16': 'var(--space-16)',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 4px)',
  			sm: 'calc(var(--radius) - 8px)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)',
  			'3xl': '2rem',
  		},
  		boxShadow: {
  			'elevation-xs': 'var(--shadow-xs)',
  			'elevation-sm': 'var(--shadow-sm)',
  			'elevation-md': 'var(--shadow-md)',
  			'elevation-lg': 'var(--shadow-lg)',
  			'elevation-xl': 'var(--shadow-xl)',
  			'focus-ring': 'var(--shadow-focus)',
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
  			},
  			'fade-in': {
  				from: { opacity: '0', transform: 'translateY(4px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			'fade-out': {
  				from: { opacity: '1', transform: 'translateY(0)' },
  				to: { opacity: '0', transform: 'translateY(4px)' }
  			},
  			'scale-in': {
  				from: { opacity: '0', transform: 'scale(0.95)' },
  				to: { opacity: '1', transform: 'scale(1)' }
  			},
  			'slide-in-right': {
  				from: { transform: 'translateX(100%)' },
  				to: { transform: 'translateX(0)' }
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.2s ease-out',
  			'fade-out': 'fade-out 0.15s ease-in',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  		},
  		fontFamily: {
  			sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Arial', 'sans-serif'],
  			serif: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
  		},
  		fontSize: {
  			'hero': ['32px', { lineHeight: '1.08', fontWeight: '700', letterSpacing: '-0.02em' }],
  			'display': ['24px', { lineHeight: '1.12', fontWeight: '700', letterSpacing: '-0.015em' }],
  			'heading': ['18px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
  			'title': ['15px', { lineHeight: '1.3', fontWeight: '500' }],
  			'body': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
  			'caption': ['11px', { lineHeight: '1.3', fontWeight: '500', letterSpacing: '0.02em' }],
  			'micro': ['10px', { lineHeight: '1.3', fontWeight: '500' }],
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
