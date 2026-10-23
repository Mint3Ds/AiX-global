/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: "#0071e3",
          hover: "#0077ed",
          bg: "#f5f5f7",
          card: "#ffffff",
          subtext: "#86868b",
          border: "#e5e5ea",
          ink: "#1d1d1f",
        },
      },
    },
  },
  plugins: [],
};
