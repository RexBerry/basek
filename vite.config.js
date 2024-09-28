import { defineConfig } from "vite";
import { resolve } from "path";

import devtools from "solid-devtools/vite";
import eslintPlugin from "@nabla/vite-plugin-eslint";
import solid from "vite-plugin-solid";
import solidStyled from "vite-plugin-solid-styled";

export default defineConfig({
    base: "./",
    build: {
        // Comment following line to build as library
        /*
        lib: {
            entry: resolve(__dirname, "lib/main.ts"),
            name: "basek",
            fileName: "basek",
            formats: ["es", "cjs"],
        },
        //*/
    },
    plugins: [
        eslintPlugin(),
        devtools(),
        solid(),
        solidStyled({
            filter: {
                include: "src/**/*.{js,jsx,ts,tsx}",
            },
        }),
    ],
    resolve: {
        alias: {
            "@root": resolve(__dirname, "./"),
            "@public": resolve(__dirname, "./public"),
            "@src": resolve(__dirname, "./src"),
            "@lib": resolve(__dirname, "./lib"),
        },
    },
});
