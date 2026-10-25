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
          50: "#fbfbfb",
          100: "#f0f2f5",
          800: "#181d24",
          900: "#0f1217",
          accent: "#ff5e14",
          accentHover: "#e04e0b",
        },
      },
    },
  },
  plugins: [],
};
