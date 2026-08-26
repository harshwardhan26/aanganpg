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
  ]),
]);

export default eslintConfig;
