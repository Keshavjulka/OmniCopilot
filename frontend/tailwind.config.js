/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0eaff",
          500: "#4f6ef7",
          600: "#3a57e8",
          700: "#2d46d6",
          900: "#1a2a8a",
        },
        surface: {
          0: "#09090f",
          1: "#0f0f1a",
          2: "#141422",
          3: "#1a1a2e",
          4: "#212138",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "typing": "typing 1.2s steps(3) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        typing: { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.3 } },
      },
    },
  },
  plugins: [],
};
