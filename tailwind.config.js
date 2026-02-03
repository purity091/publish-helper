/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'arabic': ['IBM Plex Sans Arabic', 'sans-serif'],
                'serif': ['IBM Plex Sans Arabic', 'sans-serif'],
            },
            colors: {
                primary: '#4f46e5',
                secondary: '#1e293b',
            },
        },
    },
    plugins: [],
}
