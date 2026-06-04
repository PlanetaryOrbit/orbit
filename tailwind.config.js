/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tovybg: "#FF0099",
        orbit: "#FF0099",
        primary: "rgb(var(--group-theme) / <alpha-value>)",
      },
      backgroundImage: (theme) => ({
        "infobg-light": "url('/orbitbackground-light.svg')",
        "infobg-dark": "url('/orbitbackground-dark.svg')",
      }),
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.5)", opacity: "0.7" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
