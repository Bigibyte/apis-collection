import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { readAllApis, getProjectRoot } from "../utils.js";
import { loadCategories, sortCategories, categoryIcon } from "../categories.js";
import type { Api } from "../schema.js";

function registerHelpers(categories: Record<string, string>): void {
  Handlebars.registerHelper("short", (s: string | undefined) => {
    if (!s || s.length <= 50) return s;
    const cleaned = s.replace(/\n/g, ". ");
    return (cleaned.split(/[.!?]/)[0] || cleaned).trim();
  });

  Handlebars.registerHelper("slug", (s: string) => {
    return s.replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g, "-").toLowerCase();
  });

  Handlebars.registerHelper("category_icon", (s: string) => categoryIcon(categories, s));

  Handlebars.registerHelper("pricing_badge", (pricing: Api["pricing"]) => {
    if (pricing === "free") return " 🆓";
    if (pricing === "freemium") return " 🪙";
    return "";
  });

  Handlebars.registerHelper("status_badge", (status: Api["status"]) => {
    if (status === "deprecated") return " ⚠️";
    return "";
  });

  Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b);
}

export async function build(): Promise<void> {
  const root = getProjectRoot();
  const apis = readAllApis(root);
  const categories = loadCategories(root);
  registerHelpers(categories);

  const byCategory: Record<string, Api[]> = {};
  const graveyard: Api[] = [];
  const categoryNames: string[] = [];

  for (const api of apis) {
    if (api.status === "dead") {
      graveyard.push(api);
      continue;
    }
    for (const cat of [...api.categories].sort(sortCategories)) {
      byCategory[cat] ??= [];
      byCategory[cat].push(api);
      if (!categoryNames.includes(cat)) categoryNames.push(cat);
    }
  }

  const active = apis.filter((a) => a.status !== "dead");

  const readmeTemplate = Handlebars.compile(
    fs.readFileSync(path.join(root, "templates", "README.handlebars"), "utf-8"),
  );
  fs.writeFileSync(
    path.join(root, "README.md"),
    readmeTemplate({
      categoriesNames: categoryNames.sort(sortCategories),
      apis: byCategory,
      Graveyard: graveyard,
      activeCount: active.length,
      categoryCount: categoryNames.length,
    }),
  );

  const pagesDir = path.join(root, "pages");
  fs.mkdirSync(pagesDir, { recursive: true });
  const itemTemplate = Handlebars.compile(
    fs.readFileSync(path.join(root, "templates", "item.handlebars"), "utf-8"),
  );

  let pageCount = 0;
  for (const api of apis) {
    const apiPageDir = path.join(pagesDir, api.slug);
    fs.mkdirSync(apiPageDir, { recursive: true });
    fs.writeFileSync(path.join(apiPageDir, "README.md"), itemTemplate(api));
    pageCount++;
  }

  const dataDir = path.join(root, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "apis.json"), JSON.stringify(apis, null, 2));
  const slim = apis.map((a) => ({
    name: a.name,
    slug: a.slug,
    description: a.description,
    categories: a.categories,
    status: a.status,
    pricing: a.pricing,
    auth_type: a.auth_type,
    https: a.https,
    cors: a.cors,
    url: a.links?.[0]?.url,
  }));
  fs.writeFileSync(path.join(dataDir, "apis.min.json"), JSON.stringify(slim));
  fs.writeFileSync(path.join(dataDir, "categories.json"), JSON.stringify(categories, null, 2));

  // Feed the static site so `npm run build` keeps it in sync with the YAML source.
  const siteDataDir = path.join(root, "site", "data");
  if (fs.existsSync(path.join(root, "site"))) {
    fs.mkdirSync(siteDataDir, { recursive: true });
    fs.writeFileSync(path.join(siteDataDir, "apis.min.json"), JSON.stringify(slim));
    fs.writeFileSync(path.join(siteDataDir, "categories.json"), JSON.stringify(categories, null, 2));
  }

  console.log(
    `Built: ${active.length} active, ${graveyard.length} graveyard, ${categoryNames.length} categories, ${pageCount} pages, JSON + site data`,
  );
}
