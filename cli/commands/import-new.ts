import fs from "node:fs";
import path from "node:path";
import {
  collectionDir,
  graveyardDir,
  getProjectRoot,
  listYamlFiles,
  writeYamlFile,
  makeSlug,
  compact,
  readAllApis,
} from "../utils.js";
import type { AuthType } from "../schema.js";

const SOURCE_URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";

/** public-apis category -> our categories.yaml taxonomy. */
export const CATEGORY_MAP: Record<string, string> = {
  Animals: "Animals",
  Anime: "Comics & Anime",
  "Anti-Malware": "Security",
  "Art & Design": "Art & Design",
  "Authentication & Authorization": "Authentication & User Management",
  Blockchain: "Blockchain & Cryptocurrencies",
  Books: "Books",
  Business: "Business",
  Calendar: "Calendar & Time",
  "Cloud Storage & File Sharing": "Files & Storage",
  "Continuous Integration": "Development",
  Cryptocurrency: "Blockchain & Cryptocurrencies",
  "Currency Exchange": "Finance & Economics",
  "Data Validation": "Validation & Verification",
  Development: "Development",
  Dictionaries: "Content & Dictionaries",
  "Documents & Productivity": "Documents & Productivity",
  Email: "Email & SMS",
  Entertainment: "Entertainment",
  Environment: "Environment & Nature",
  Events: "Events",
  Finance: "Finance & Economics",
  "Food & Drink": "Food & Drinks",
  "Games & Comics": "Games",
  Geocoding: "Maps & Geo",
  Government: "Government",
  Health: "Health",
  Jobs: "Jobs",
  "Machine Learning": "AI & ML",
  Music: "Music & Audio",
  News: "News & Feeds",
  "Open Data": "Statistics & Data",
  "Open Source Projects": "Open Source",
  Patent: "Other",
  Personality: "Other",
  Phone: "Other",
  Photography: "Images & Photography",
  Programming: "Development",
  "Science & Math": "Science & Math",
  Security: "Security",
  Shopping: "Commerce",
  Social: "Social",
  "Sports & Fitness": "Sport & Fitness",
  "Test Data": "Testing",
  "Text Analysis": "Text Analysis & Tools",
  Tracking: "Post & Logistics",
  Transportation: "Transportation",
  "URL Shorteners": "URLs",
  Vehicle: "Vehicles",
  Video: "Video & Media",
  Weather: "Weather",
};

const AUTH_MAP: Record<string, AuthType> = {
  no: "none",
  "": "none",
  apikey: "api_key",
  "x-mashape-key": "api_key",
  oauth: "oauth2",
  "user-agent": "none",
};

export interface SourceApi {
  name: string;
  url: string;
  description: string;
  category: string;
  auth_type: AuthType;
  https?: boolean;
  cors?: "yes" | "no";
}

function parseAuth(cell: string): AuthType {
  return AUTH_MAP[cell.replace(/`/g, "").trim().toLowerCase()] ?? "unknown";
}

function parseYesNo(cell: string): "yes" | "no" | undefined {
  const v = cell.trim().toLowerCase();
  return v === "yes" ? "yes" : v === "no" ? "no" : undefined;
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const nameKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Parse the public-apis README into structured rows, tracking the section category. */
export function parseSource(markdown: string): SourceApi[] {
  const rows: SourceApi[] = [];
  let category = "Other";
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading && !line.startsWith("| ")) {
      category = heading[1].replace(/\s*\[.*$/, "").trim();
      continue;
    }
    if (!line.startsWith("| [")) continue;
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6) continue;
    const httpsRaw = cells[4].toLowerCase();
    const corsRaw = cells[5].toLowerCase();
    if (!["yes", "no", "unknown"].includes(httpsRaw)) continue;
    if (!["yes", "no", "unknown"].includes(corsRaw)) continue;
    const m = cells[1].match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (!m) continue;
    const https = parseYesNo(cells[4]);
    rows.push({
      name: m[1].trim(),
      url: m[2].trim(),
      description: cells[2],
      category,
      auth_type: parseAuth(cells[3]),
      https: https === undefined ? undefined : https === "yes",
      cors: parseYesNo(cells[5]),
    });
  }
  return rows;
}

export async function importNew(opts: { file?: string; date?: string } = {}): Promise<void> {
  const markdown = opts.file
    ? fs.readFileSync(opts.file, "utf-8")
    : await fetch(SOURCE_URL, { headers: { "User-Agent": "bigibyte-apis-collection/1.0" } }).then(
        (r) => {
          if (!r.ok) throw new Error(`Failed to fetch source: HTTP ${r.status}`);
          return r.text();
        },
      );

  const source = parseSource(markdown);
  console.log(`Parsed ${source.length} APIs from public-apis`);

  const root = getProjectRoot();
  const existing = readAllApis(root);
  const haveNames = new Set(existing.map((a) => nameKey(a.name)));
  const haveDomains = new Set(
    existing.flatMap((a) => (a.links ?? []).map((l) => (l.url ? domainOf(l.url) : null))).filter(Boolean),
  );
  const existingSlugs = new Set([
    ...listYamlFiles(collectionDir(root)),
    ...listYamlFiles(graveyardDir(root)),
  ].map((f) => f.replace(/\.yaml$/, "")));

  const today = opts.date ?? new Date().toISOString().slice(0, 10);
  const usedSlugs = new Set<string>();
  const byCategory: Record<string, number> = {};
  let created = 0;
  let skippedExisting = 0;
  let skippedSlugCollision = 0;
  let skippedBadUrl = 0;

  for (const row of source) {
    if (haveNames.has(nameKey(row.name))) {
      skippedExisting++;
      continue;
    }
    const domain = domainOf(row.url);
    if (!domain) {
      skippedBadUrl++;
      continue;
    }
    if (haveDomains.has(domain)) {
      skippedExisting++;
      continue;
    }
    const slug = makeSlug(row.name);
    if (!slug || existingSlugs.has(slug) || usedSlugs.has(slug)) {
      skippedSlugCollision++;
      continue;
    }
    usedSlugs.add(slug);

    const category = CATEGORY_MAP[row.category] ?? "Other";
    byCategory[category] = (byCategory[category] ?? 0) + 1;

    const entry = compact({
      name: row.name,
      slug,
      description: row.description,
      categories: [category],
      pricing: "unknown",
      auth_type: row.auth_type,
      https: row.https,
      cors: row.cors,
      added: today,
      source: "public-apis/public-apis",
      links: [{ name: "Docs / Website", url: row.url }],
    });

    writeYamlFile(path.join(collectionDir(root), `${slug}.yaml`), entry);
    created++;
  }

  console.log(
    `Created ${created} new entries; skipped ${skippedExisting} already-have, ${skippedSlugCollision} slug collisions, ${skippedBadUrl} bad URLs`,
  );
  console.log(`\nNew entries by category:`);
  for (const [cat, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1]))
    console.log(`  ${cat.padEnd(34)} ${n}`);
  console.log(`\nNext: npm run validate && npm run build`);
}
