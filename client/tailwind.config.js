/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // E-Project brand — aligned with the E-Mongolia portal palette.
        brand: {
          DEFAULT: "#1268EB",
          dark: "#0F56C4",
          50: "#EAF2FE",
          100: "#D0E2FD",
          200: "#A6C8FA",
          300: "#6FA5F5",
          400: "#3B84F0",
          500: "#1268EB",
          600: "#0F56C4",
          700: "#0C459C",
          800: "#0A3576",
          900: "#072450",
        },
        // Approval / success accent — APPROVED state, confirmations.
        accent: {
          DEFAULT: "#22A15C",
          dark: "#1A8149",
          light: "#E6F6EA",
        },
        // E-Mongolia logo red — reserved for rejected / overdue emphasis.
        flag: "#EE3124",
        ink: "#0A2148", // sidebar
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        pop: "0 10px 30px -10px rgb(15 23 42 / 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
