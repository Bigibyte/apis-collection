import path from "node:path";
import inquirer from "inquirer";
import { makeSlug, writeYamlFile, compact, getProjectRoot, collectionDir } from "../utils.js";
import { loadCategories } from "../categories.js";
import type { Api } from "../schema.js";

export async function add(): Promise<void> {
  const root = getProjectRoot();
  const categories = loadCategories(root);
  const categoryChoices = Object.keys(categories);

  const answers = await inquirer.prompt([
    { name: "name", message: "API name:", type: "input", validate: (v: string) => (v.length > 0 ? true : "Required") },
    { name: "description", message: "Description:", type: "input" },
    { name: "url", message: "Docs / Website URL:", type: "input" },
    {
      name: "categories",
      message: "Categories:",
      type: "checkbox",
      choices: categoryChoices,
      validate: (v: string[]) => (v.length > 0 ? true : "Select at least one"),
    },
    { name: "type", message: "API type (REST, GraphQL, etc):", type: "input", default: "REST" },
    {
      name: "pricing",
      message: "Pricing:",
      type: "list",
      choices: ["free", "freemium", "paid", "unknown"],
      default: "freemium",
    },
    {
      name: "auth_type",
      message: "Auth type:",
      type: "list",
      choices: ["none", "api_key", "oauth2", "bearer", "basic", "unknown"],
      default: "api_key",
    },
    { name: "https", message: "HTTPS only?", type: "confirm", default: true },
    {
      name: "cors",
      message: "CORS support:",
      type: "list",
      choices: ["yes", "no", "unknown"],
      default: "unknown",
    },
  ]);

  const slug = makeSlug(answers.name as string);
  const today = new Date().toISOString().slice(0, 10);
  const api: Partial<Api> = compact({
    name: answers.name,
    slug,
    description: (answers.description as string) || undefined,
    categories: answers.categories as string[],
    type: (answers.type as string) || undefined,
    pricing: answers.pricing as Api["pricing"],
    auth_type: answers.auth_type as Api["auth_type"],
    https: answers.https as boolean,
    cors: answers.cors as Api["cors"],
    added: today,
    last_verified: today,
    links: (answers.url as string)
      ? [{ name: "Docs / Website", url: answers.url as string }]
      : undefined,
  });

  const outPath = path.join(collectionDir(root), `${slug}.yaml`);
  writeYamlFile(outPath, api);
  console.log(`Created ${outPath}`);
}
