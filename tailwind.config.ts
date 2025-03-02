
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
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
				sage: {
					50: '#f4f7f4',
					100: '#e4ebe5',
					200: '#ccd8ce',
					300: '#aabdae',
					400: '#839b87',
					500: '#657f6a',
					600: '#506653',
					700: '#425245',
					800: '#38443a',
					900: '#313a32',
					950: '#1a201c',
				},
				terracotta: {
					50: '#fbf6f2',
					100: '#f6e9df',
					200: '#edd2bc',
					300: '#e3b594',
					400: '#d99169',
					500: '#d1774d',
					600: '#c26344',
					700: '#a14b3a',
					800: '#833f34',
					900: '#6c372d',
					950: '#3a1b16',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
				display: ['var(--font-display)', 'serif'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				fadeIn: {
					from: { opacity: '0' },
					to: { opacity: '1' },
				},
				slideUp: {
					from: { transform: 'translateY(10px)', opacity: '0' },
					to: { transform: 'translateY(0)', opacity: '1' },
				},
				slideDown: {
					from: { transform: 'translateY(-10px)', opacity: '0' },
					to: { transform: 'translateY(0)', opacity: '1' },
				},
				pulse: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' },
				},
				shimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' },
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fadeIn 0.5s ease-out',
				'slide-up': 'slideUp 0.5s ease-out',
				'slide-down': 'slideDown 0.5s ease-out',
				'pulse-slow': 'pulse 3s infinite',
				'shimmer': 'shimmer 2s infinite linear',
				'float': 'float 3s ease-in-out infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
