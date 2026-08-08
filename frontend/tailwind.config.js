/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#1DB954",
          greenDark: "#169c46",
        },
        surface: {
          base: "#0b0b0d",
          raised: "#121214",
          card: "#181818",
          hover: "#282828",
          border: "#2a2a2a",
        },
        textmuted: "#a7a7a7",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: { "0%": { transform: "translateY(8px)", opacity: 0 }, "100%": { transform: "translateY(0)", opacity: 1 } },
      },
      animation: {
        fadeIn: "fadeIn 0.25s ease-out",
        slideUp: "slideUp 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
