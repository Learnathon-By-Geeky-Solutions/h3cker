const flowbite = require("flowbite-react/tailwind");
/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/flowbite/**/*.js", // Include Flowbite components
    "node_modules/flowbite-react/**/*.js", // Include Flowbite React
    flowbite.content(),
  ],
  theme: {
    extend: {
      colors: {
        'custom-gray': '#E0E1DD',
        'soft-muted-blue-gray':'#778DA9',
        'desaturated-blue':'#415A77',
        'dark-blue-gray':'#1B263B',
        'custom-dark-blue': '#0D1B2A',
      }
    },
  },
  plugins: [
    require('flowbite/plugin'), // Add Flowbite plugin
    flowbite.plugin(),
  ],
}

