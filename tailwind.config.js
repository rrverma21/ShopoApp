/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        "border-secondary": "hsl(var(--border-secondary))",
        input: "hsl(var(--input))",
        "input-bg": "hsl(var(--input-bg))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        heading: "hsl(var(--heading))",
        text: "hsl(var(--text))",
        "secondary-text": "hsl(var(--secondary-text))",
        "disabled-text": "hsl(var(--disabled-text))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--heading))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--secondary-text))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--heading))",
        },
        popover: {
          DEFAULT: "hsl(var(--dropdown-menu-bg))",
          foreground: "hsl(var(--text))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--text))",
        },
        highlight: "hsl(var(--highlight))",
        featured: "hsl(var(--featured))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        error: "hsl(var(--error))",
        "table-row-hover": "hsl(var(--table-row-hover))",
        "alt-row": "hsl(var(--alt-row))",
        "modal-bg": "hsl(var(--modal-bg))",
        "modal-content": "hsl(var(--modal-content))",
        "modal-header-bg": "hsl(var(--modal-header-bg))",
        "default-badge": "hsl(var(--default-badge))",
        "primary-badge": "hsl(var(--primary-badge))",
        sidebar: "hsl(var(--sidebar))",
        "sidebar-active-bg": "hsl(var(--sidebar-active-bg))",
        "dropdown-menu-bg": "hsl(var(--dropdown-menu-bg))",
        "dropdown-hover-bg": "hsl(var(--dropdown-hover-bg))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}