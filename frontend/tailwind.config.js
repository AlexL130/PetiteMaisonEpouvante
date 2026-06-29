/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        abyss: "#0a0a0a",
        void: "#111111",
        smoke: "#1a1a1a",
        ash: "#2a2a2a",
        mist: "#e5e5e5",
        bone: "#d4d4d4",
        blood: {
          DEFAULT: "#ff0040",
          dark: "#cc0033",
          glow: "#ff1a57",
        },
        phantom: {
          DEFAULT: "#7c3aed",
          dark: "#6d28d9",
          glow: "#8b5cf6",
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
        accent: ['"Crimson Text"', "serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "flicker": "flicker 3s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: 0.6 },
          "50%": { opacity: 1 },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        flicker: {
          "0%, 100%": { opacity: 1 },
          "41%": { opacity: 1 },
          "42%": { opacity: 0.8 },
          "43%": { opacity: 1 },
          "45%": { opacity: 0.3 },
          "46%": { opacity: 1 },
        },
      },
      backgroundImage: {
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
