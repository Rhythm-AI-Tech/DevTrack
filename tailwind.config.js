/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        zinc: { 950: "#09090b" },
        devtrack: { accent: "#6366f1", violet: "#8b5cf6" },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(129,140,248,.16), 0 12px 40px rgba(0,0,0,.16)",
      },
    },
  },
  plugins: [],
};
