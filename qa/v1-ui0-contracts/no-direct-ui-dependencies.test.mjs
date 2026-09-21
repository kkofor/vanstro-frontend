import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { importedSpecifiers, projectFiles, root, uiDir, uiSourceFiles } from "./contract-helpers.mjs";

const approvedDirectUiDependencies = new Set([
  "@radix-ui/react-dialog",
  "class-variance-authority",
  "clsx",
  "tailwind-merge"
]);

function thirdPartyUiImports(file) {
  return importedSpecifiers(readFileSync(file, "utf8")).filter((specifier) =>
    specifier.startsWith("@radix-ui/") || approvedDirectUiDependencies.has(specifier)
  );
}

test("feature source never imports approved or unapproved Radix/UI implementation dependencies directly", () => {
  const violations = [];
  for (const file of projectFiles("src", new Set([".ts", ".tsx"]))) {
    if (file.startsWith(`${uiDir}/`)) continue;
    for (const specifier of thirdPartyUiImports(file)) {
      violations.push(`${relative(root, file)} -> ${specifier}`);
    }
  }
  assert.deepEqual(violations, [], "feature code must consume @/components/ui/* instead of implementation dependencies");
});

test("the UI directory imports no Radix package except Dialog", () => {
  const violations = [];
  for (const file of uiSourceFiles({ includeLegacy: true })) {
    for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
      if (specifier.startsWith("@radix-ui/") && specifier !== "@radix-ui/react-dialog") {
        violations.push(`${relative(root, file)} -> ${specifier}`);
      }
    }
  }
  assert.deepEqual(violations, [], "only @radix-ui/react-dialog is approved for UI-0");
});

test("approved implementation dependencies remain private to the physical UI directory", () => {
  const violations = [];
  for (const file of projectFiles("src", new Set([".ts", ".tsx"]))) {
    if (file.startsWith(`${uiDir}/`)) continue;
    for (const specifier of importedSpecifiers(readFileSync(file, "utf8"))) {
      if (approvedDirectUiDependencies.has(specifier)) violations.push(`${relative(root, file)} -> ${specifier}`);
    }
  }
  assert.deepEqual(violations, []);
});
