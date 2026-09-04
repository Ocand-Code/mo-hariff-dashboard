/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0F2342",
        navy2: "#1A3A5F",
        gold: "#C8A96A",
        goldDark: "#B8954E",
      },
      fontFamily: {
        sans: ["Inter", "Calibri", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
};
