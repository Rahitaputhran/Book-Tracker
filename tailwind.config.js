    /** @type {import('tailwindcss').Config} */
    export default { // Note: Vite uses ES Modules, so 'export default'
      content: [
        "./index.html", // Important: Vite scans your root HTML for classes
        "./src/**/*.{js,ts,jsx,tsx}", // Scans all JS/TS/JSX/TSX files in src
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    