/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#0f172a",
        success: "#22c55e",
        danger: "#ef4444",
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.08)",
      },

      borderRadius: {
        xl: "1rem",
      },
    },
  },

  plugins: [require("@tailwindcss/forms"),
  require("@tailwindcss/typography"),],
};