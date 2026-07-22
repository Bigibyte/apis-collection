import { describe, it, expect } from "vitest";
import { parseSource, CATEGORY_MAP } from "../cli/commands/import-new.js";
import { apiSchema } from "../cli/schema.js";
import { makeSlug, compact } from "../cli/utils.js";
import { loadCategories } from "../cli/categories.js";

const SAMPLE = `
### Animals
| API | Description | Auth | HTTPS | CORS |
|---|:---|:---|:---|:---|
| [Cat Facts](https://catfact.ninja/) | Daily cat facts | No | Yes | No |
| [Dog CEO](https://dog.ceo/dog-api/) | Dog pictures | No | Yes | Yes |

### Machine Learning
| API | Description | Auth | HTTPS | CORS |
|---|:---|:---|:---|:---|
| [Cool ML](https://example-ml.com/) | Does ML things | \`apiKey\` | Yes | Unknown |
`;

describe("parseSource", () => {
  const rows = parseSource(SAMPLE);

  it("captures the section category per row", () => {
    expect(rows.find((r) => r.name === "Cat Facts")?.category).toBe("Animals");
    expect(rows.find((r) => r.name === "Cool ML")?.category).toBe("Machine Learning");
  });

  it("extracts name, url, description", () => {
    const dog = rows.find((r) => r.name === "Dog CEO");
    expect(dog?.url).toBe("https://dog.ceo/dog-api/");
    expect(dog?.description).toBe("Dog pictures");
  });

  it("maps auth, https and cors", () => {
    const ml = rows.find((r) => r.name === "Cool ML");
    expect(ml?.auth_type).toBe("api_key");
    expect(ml?.https).toBe(true);
    expect(ml?.cors).toBeUndefined();
    const cat = rows.find((r) => r.name === "Cat Facts");
    expect(cat?.cors).toBe("no");
  });
});

describe("CATEGORY_MAP", () => {
  it("only maps to categories that exist in categories.yaml", () => {
    const valid = new Set(Object.keys(loadCategories()));
    for (const target of Object.values(CATEGORY_MAP)) {
      expect(valid.has(target), `missing category: ${target}`).toBe(true);
    }
  });
});

describe("generated entries", () => {
  it("pass the schema", () => {
    const rows = parseSource(SAMPLE);
    for (const row of rows) {
      const entry = compact({
        name: row.name,
        slug: makeSlug(row.name),
        description: row.description,
        categories: [CATEGORY_MAP[row.category] ?? "Other"],
        pricing: "unknown",
        auth_type: row.auth_type,
        https: row.https,
        cors: row.cors,
        added: "2026-07-20",
        source: "public-apis/public-apis",
        links: [{ name: "Docs / Website", url: row.url }],
      });
      expect(apiSchema.safeParse(entry).success, `failed: ${row.name}`).toBe(true);
    }
  });
});
