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
        jersey: ['"Jersey 25"', "sans-serif"],
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
          cute: "#f163cf"
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
      fontSize: {
        xxs: ['0.75rem', { lineHeight: '1rem' }],      // 12px (original xs)
        xs: ['0.875rem', { lineHeight: '1.25rem' }],   // 14px (original sm)
        sm: ['1rem', { lineHeight: '1.5rem' }],        // 16px (original base)
        base: ['1.125rem', { lineHeight: '1.75rem' }], // 18px (original lg)
        lg: ['1.25rem', { lineHeight: '1.75rem' }],    // 20px (original xl)
        xl: ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],// 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};