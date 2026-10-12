/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Amiri", "Georgia", "Cambria", "serif"],
        arabic: ["Amiri", "Scheherazade New", "Traditional Arabic", "serif"],
      },
    },
  },
  plugins: [],
};
