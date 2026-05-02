/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f3ff",
          100: "#ede9fe",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          900: "#2e1065",
        },
        surface: {
          900: "#0a0a0f",
          800: "#111118",
          700: "#18181f",
          600: "#1e1e2e",
          500: "#252535",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient": "gradient 6s ease infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundSize: {
        "300%": "300%",
      },
    },
  },
  plugins: [],
};
