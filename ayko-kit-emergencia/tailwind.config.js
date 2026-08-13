/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#080b12",
        card: "#10151f",
        cardhover: "#161d2b",
        border: "#1f2733",
        purple: "#b063ff",
        cyan: "#31fcf3",
        blue: "#5b8def",
        green: "#34d399",
        orange: "#f5a524",
        red: "#f5624f",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
