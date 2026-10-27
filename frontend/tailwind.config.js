/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gym: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7", // Ocean Blue Primary
          700: "#0369a1",
          800: "#0f172a", // Dark Slate Neutral
          900: "#020617",
          accent: "#0066FF", // Royal Ocean Blue Accent
          accentHover: "#0052cc",
          cyan: "#06b6d4",  // Cyan Dạ Quang
          deep: "#1e40af",  // Royal Deep Blue
        },
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.45)',
        'glow-blue': '0 0 30px -4px rgba(0, 102, 255, 0.35)',
        'card-hover': '0 20px 40px -15px rgba(2, 132, 199, 0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};

