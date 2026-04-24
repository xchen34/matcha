/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', "sans-serif"],
      },
      colors: {
        brand: "#e85d04",
        "brand-deep": "#d9480f",
      },
    },
  },
  plugins: [],
};
