/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', "sans-serif"],
      },
      colors: {
        // 💗 Primary color
        primary: {
          DEFAULT: "#ec4899", // vivid pink
          light: "#fdf2f8",   // light pink for backgrounds
        },
        // ✅ Success / valid color
        valid: "#16a34a",     // green 700
        // ❌ Error color
        error: "#ef4444",     // red 500
        // ⚪ Neutral color
        neutral: {
          DEFAULT: "#6b7280", // gray 500
          light: "#f3f4f6",   // light gray (background)
          dark: "#111827",    // dark gray (text)
        },
      },
    },
  },
  plugins: [],
};
