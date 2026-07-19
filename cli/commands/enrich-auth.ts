import fs from "node:fs";
import path from "node:path";
import { collectionDir, getProjectRoot, listYamlFiles, readYamlFile, writeYamlFile } from "../utils.js";
import type { Api, AuthType } from "../schema.js";

const SOURCE_URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";

interface SourceRow {
  auth?: AuthType;
  https?: boolean;
  cors?: "yes" | "no";
}

const AUTH_MAP: Record<string, AuthType> = {
  no: "none",
  "": "none",
  apikey: "api_key",
  "x-mashape-key": "api_key",
  oauth: "oauth2",
  "user-agent": "none",
};

/** Collapse a name to a comparison key: lowercase alphanumerics only. */
export function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAuth(cell: string): AuthType | undefined {
  const cleaned = cell.replace(/`/g, "").trim().toLowerCase();
  return AUTH_MAP[cleaned];
}

function parseYesNo(cell: string): "yes" | "no" | undefined {
  const v = cell.trim().toLowerCase();
  if (v === "yes") return "yes";
  if (v === "no") return "no";
  return undefined;
}

/** Parse the public-apis README into a name-key -> {auth, https, cors} map. */
export function parseSource(markdown: string): Map<string, SourceRow> {
  const map = new Map<string, SourceRow>();
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("| [")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // Expect: ['', '[Name](url)', 'desc', 'auth', 'https', 'cors', ''] -> 7 parts
    if (cells.length < 6) continue;
    const nameMatch = cells[1].match(/\[([^\]]+)\]/);
    if (!nameMatch) continue;
    const https = parseYesNo(cells[4]);
    const cors = parseYesNo(cells[5]);
    const auth = parseAuth(cells[3]);
    // A real data row has recognizable HTTPS/CORS (Yes/No/Unknown). This filters
    // out the sponsored "Call this API" table, whose 3rd+ cells are Postman buttons.
    const httpsRaw = cells[4].toLowerCase();
    const corsRaw = cells[5].toLowerCase();
    const looksLikeDataRow =
      ["yes", "no", "unknown"].includes(httpsRaw) && ["yes", "no", "unknown"].includes(corsRaw);
    if (!looksLikeDataRow) continue;

    map.set(nameKey(nameMatch[1]), {
      auth,
      https: https === undefined ? undefined : https === "yes",
      cors,
    });
  }
  return map;
}

export async function enrichAuth(opts: { file?: string } = {}): Promise<void> {
  const markdown = opts.file
    ? fs.readFileSync(opts.file, "utf-8")
    : await fetch(SOURCE_URL, { headers: { "User-Agent": "bigibyte-apis-collection/1.0" } }).then(
        (r) => {
          if (!r.ok) throw new Error(`Failed to fetch source: HTTP ${r.status}`);
          return r.text();
        },
      );

  const source = parseSource(markdown);
  console.log(`Parsed ${source.size} APIs from public-apis`);

  const root = getProjectRoot();
  const dir = collectionDir(root);
  let matched = 0;
  let authFilled = 0;
  let httpsFilled = 0;
  let corsFilled = 0;

  for (const file of listYamlFiles(dir)) {
    const filePath = path.join(dir, file);
    const api = readYamlFile<Api>(filePath);
    const row = source.get(nameKey(api.name)) ?? source.get(nameKey(api.slug));
    if (!row) continue;
    matched++;

    let changed = false;
    if ((api.auth_type === undefined || api.auth_type === "unknown") && row.auth) {
      api.auth_type = row.auth;
      authFilled++;
      changed = true;
    }
    if (api.https === undefined && row.https !== undefined) {
      api.https = row.https;
      httpsFilled++;
      changed = true;
    }
    if (api.cors === undefined && row.cors) {
      api.cors = row.cors;
      corsFilled++;
      changed = true;
    }

    if (changed) writeYamlFile(filePath, api);
  }

  console.log(
    `Matched ${matched} entries by name; filled auth_type on ${authFilled}, https on ${httpsFilled}, cors on ${corsFilled}`,
  );
}
