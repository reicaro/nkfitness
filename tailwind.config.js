/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "neutral-50": "#fafbfc",
        darkslategray: "#3c3d3c",
        "base-white": "#fff",
        "neutral-700": "#dae0e6",
        "gray-700": "#272d37",
        "gray-50": "#5f6d7e",
      },
      fontFamily: {
        inter: "Inter",
      },
    },
    fontSize: {
      mini: "15px",
      sm: "14px",
    },
  },
  corePlugins: {
    preflight: false,
  },
};
