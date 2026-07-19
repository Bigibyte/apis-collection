import path from "node:path";
import {
  collectionDir,
  graveyardDir,
  getProjectRoot,
  listYamlFiles,
  readYamlFile,
  writeYamlFile,
  makeSlug,
  compact,
} from "../utils.js";
import type { Library, Link, Specification } from "../schema.js";

export interface UpstreamApi {
  name: string;
  slug: string;
  description?: string;
  categories: string[];
  type?: string;
  is_free?: boolean;
  is_active?: boolean;
  logo?: string | null;
  contact?: string;
  discussion_url?: string;
  auth_type?: string;
  rate_limits?: string;
  tags?: string[];
  specification?: Specification;
  links?: Link[];
  libraries?: Library[];
}

const SLUG_RE = /^[a-z0-9-]+$/;
const AUTH_TYPES = new Set(["none", "api_key", "oauth2", "bearer", "basic"]);

function validUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    new URL(value);
    return value;
  } catch {
    return undefined;
  }
}

export function migrateEntry(
  old: UpstreamApi,
  opts: { graveyard?: boolean } = {},
): Record<string, unknown> {
  const slug = SLUG_RE.test(old.slug) ? old.slug : makeSlug(old.slug);
  const status = opts.graveyard ? "dead" : old.is_active === false ? "deprecated" : undefined;
  const pricing = old.is_free === true ? "free" : old.is_free === false ? "paid" : undefined;
  const auth_type = old.auth_type && AUTH_TYPES.has(old.auth_type) ? old.auth_type : undefined;

  const links = old.links?.map((l) => compact({ name: l.name, url: validUrl(l.url) }));

  return compact({
    name: old.name,
    slug,
    description: old.description,
    categories: old.categories,
    type: old.type,
    status,
    pricing,
    auth_type,
    logo: validUrl(old.logo),
    contact: old.contact,
    discussion_url: validUrl(old.discussion_url),
    rate_limits: old.rate_limits,
    tags: old.tags,
    specification: old.specification,
    links,
    libraries: old.libraries,
  });
}

function migrateDir(fromDir: string, toDir: string, graveyard: boolean): number {
  let count = 0;
  for (const file of listYamlFiles(fromDir)) {
    const old = readYamlFile<UpstreamApi>(path.join(fromDir, file));
    const migrated = migrateEntry(old, { graveyard });
    writeYamlFile(path.join(toDir, `${migrated.slug}.yaml`), migrated);
    count++;
  }
  return count;
}

export async function migrate(fromRoot: string): Promise<void> {
  const root = getProjectRoot();
  const fromCollection = path.join(fromRoot, "collection");
  const fromGraveyard = path.join(fromRoot, "graveyard");

  const migrated = migrateDir(fromCollection, collectionDir(root), false);
  const buried = migrateDir(fromGraveyard, graveyardDir(root), true);

  console.log(`Migrated ${migrated} collection + ${buried} graveyard entries from ${fromRoot}`);
  console.log(`Next: npm run validate`);
}
