import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Every query in this app goes through Prisma's query builder, which is why
    // there is no SQL injection surface. These two methods are the only way to
    // lose that, and they take a string — so ban them outright rather than
    // trusting the next person to notice.
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "prisma", property: "$queryRawUnsafe", message: "Use prisma.$queryRaw with a tagged template, or the query builder." },
        { object: "prisma", property: "$executeRawUnsafe", message: "Use prisma.$executeRaw with a tagged template, or the query builder." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The alternate build directory `AANGAN_NEXT_DIST_DIR` points at, so that a
    // verification build beside a running dev server does not bury the real
    // findings under thousands of errors from its own generated chunks.
    ".next-check/**",
    // Agent skill bundles are development tools, not application source.
    ".agents/**",
  ]),
]);

export default eslintConfig;
