import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      /*
        `<img>` is deliberate throughout this template, not an oversight.

        next/image would need every Kong storage host listed in
        next.config, and it REWRITES the url — which breaks the
        signed-token URLs Kong returns for private media. A broken
        photograph is a worse outcome than an unoptimised one.

        Turn this back on once you know your own media is public and you
        have listed the hosts; then swap the <img> tags for <Image>.
      */
      '@next/next/no-img-element': 'off',
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
