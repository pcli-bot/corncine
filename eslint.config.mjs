import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules — warn, not off, for production visibility
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/no-unused-expressions": "off",

    // React — disable overly strict experimental compiler checks that flag legitimate sync patterns
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/immutability": "off",
    "react-hooks/preserve-manual-memoization": "off",
    "react-hooks/purity": "off",
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js — allow <img> for external CDN posters (TMDB/Kitsu) where next/image would need remotePatterns for 10+ hosts
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General — keep useful warnings, but don't block build on style
    "prefer-const": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "warn",
    "no-empty": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "upload/**", "download/**", "mini-services/**", "tests/**"]
}];

export default eslintConfig;
