/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        fontFamily: {
            sans: [
                "Inter, sans-serif",
                {
                    fontFeatureSettings: "'cv05', 'cv10'",
                },
            ],
            mono: [
                "CommitMono, monospace",
                {
                    // Font features have been baked into the font file
                    // fontFeatureSettings: "'ss03' on, 'ss04' on, 'cv02' on, 'cv08' on",
                },
            ],
        },
        extend: {
            colors: {},
        },
    },
    plugins: [],
};
