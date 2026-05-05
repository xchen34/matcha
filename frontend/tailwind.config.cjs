/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', "sans-serif"], // custom font
      },
      colors: {
        brand: "#e85d04",
        "brand-deep": "#d9480f",

        // 💗 Primary color
        primary: {
          DEFAULT: "#ec4899", // vivid pink
          dark: "#db2777",
          medium: "#f472b6",
          light: "#fdf2f8",   // light pink for backgrounds
        },
        // ✅ Success / valid color
        valid: {
          light: "#dcfce7",   // green-100
          medium: "#34d399",  // green-400 
          DEFAULT: "#15803d", // green-700
          dark: "#065f46",    // green-800 
        },
        // Error / Red
        error: {
          light: "#fee2e2",   // red-100
          medium: "#f87171",  // red-400 
          DEFAULT: "#ef4444", // red-500
          dark: "#b91c1c",    // red-700 
        },
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