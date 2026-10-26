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
          800: "#0f172a",
          900: "#020617",
          accent: "#0284c7", // Ocean Blue Primary
          accentHover: "#0369a1", // Ocean Blue Darker
          ocean: "#0ea5e9", // Sky / Ocean Blue
          cyan: "#06b6d4",  // Cyan Accent
          deep: "#1d4ed8",  // Royal Blue
        },
      },
    },
  },
  plugins: [],
};
