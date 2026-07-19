import fs from "node:fs";
import path from "node:path";
import { collectionDir, graveyardDir, readYamlFile, getProjectRoot, listYamlFiles } from "../utils.js";
import { apiSchema } from "../schema.js";
import { loadCategories } from "../categories.js";

function validateDir(
  dir: string,
  validCategories: Set<string>,
  label: "collection" | "graveyard",
): number {
  let errors = 0;
  for (const file of listYamlFiles(dir)) {
    const filePath = path.join(dir, file);
    const raw = readYamlFile<unknown>(filePath);
    const result = apiSchema.safeParse(raw);
    if (!result.success) {
      console.error(`INVALID ${label}/${file}:`);
      for (const issue of result.error.issues) {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
      }
      errors++;
      continue;
    }
    for (const cat of result.data.categories) {
      if (!validCategories.has(cat)) {
        console.error(`UNKNOWN CATEGORY in ${label}/${file}: "${cat}"`);
        errors++;
      }
    }
    const expectedFilename = `${result.data.slug}.yaml`;
    if (file !== expectedFilename) {
      console.error(`SLUG MISMATCH: ${label}/${file} but slug is "${result.data.slug}"`);
      errors++;
    }
    if (label === "collection" && result.data.status === "dead") {
      console.error(`MISPLACED: ${label}/${file} has status "dead" — run move-to-graveyard`);
      errors++;
    }
    if (label === "graveyard" && result.data.status !== "dead") {
      console.error(`MISPLACED: ${label}/${file} has status "${result.data.status}" but lives in graveyard/`);
      errors++;
    }
  }
  return errors;
}

function findDuplicateSlugs(root: string): number {
  const seen = new Map<string, string>();
  let errors = 0;
  for (const [dir, label] of [
    [collectionDir(root), "collection"],
    [graveyardDir(root), "graveyard"],
  ] as const) {
    for (const file of listYamlFiles(dir)) {
      const slug = file.replace(/\.yaml$/, "");
      const existing = seen.get(slug);
      if (existing) {
        console.error(`DUPLICATE SLUG: ${label}/${file} also exists as ${existing}`);
        errors++;
      } else {
        seen.set(slug, `${label}/${file}`);
      }
    }
  }
  return errors;
}

export async function validate(): Promise<void> {
  const root = getProjectRoot();
  const categories = loadCategories(root);
  const validCategories = new Set(Object.keys(categories));
  let errors = validateDir(collectionDir(root), validCategories, "collection");
  errors += validateDir(graveyardDir(root), validCategories, "graveyard");
  errors += findDuplicateSlugs(root);
  const collFiles = listYamlFiles(collectionDir(root)).length;
  const gravFiles = listYamlFiles(graveyardDir(root)).length;
  console.log(`Validated ${collFiles} collection + ${gravFiles} graveyard files, ${errors} errors`);
  if (errors > 0) process.exit(1);
}
