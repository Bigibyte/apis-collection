import { describe, it, expect } from "vitest";
import { migrateEntry, type UpstreamApi } from "../cli/commands/migrate.js";
import { apiSchema } from "../cli/schema.js";

const base: UpstreamApi = { name: "Test", slug: "test", categories: ["Other"] };

describe("migrateEntry", () => {
  it("maps is_free true to pricing free", () => {
    expect(migrateEntry({ ...base, is_free: true }).pricing).toBe("free");
  });

  it("maps is_free false to pricing paid", () => {
    expect(migrateEntry({ ...base, is_free: false }).pricing).toBe("paid");
  });

  it("omits pricing when is_free is absent (schema defaults to unknown)", () => {
    const migrated = migrateEntry(base);
    expect(migrated.pricing).toBeUndefined();
    const parsed = apiSchema.parse(migrated);
    expect(parsed.pricing).toBe("unknown");
  });

  it("marks graveyard entries as dead", () => {
    expect(migrateEntry(base, { graveyard: true }).status).toBe("dead");
  });

  it("maps is_active false to deprecated", () => {
    expect(migrateEntry({ ...base, is_active: false }).status).toBe("deprecated");
  });

  it("drops null logo and invalid URLs", () => {
    const migrated = migrateEntry({ ...base, logo: null, discussion_url: "not a url" });
    expect(migrated.logo).toBeUndefined();
    expect(migrated.discussion_url).toBeUndefined();
  });

  it("re-slugifies invalid slugs", () => {
    expect(migrateEntry({ ...base, slug: "Bad_Slug" }).slug).toBe("badslug");
  });

  it("produces entries that pass the new schema", () => {
    const migrated = migrateEntry({
      ...base,
      is_free: true,
      auth_type: "api_key",
      links: [{ name: "Docs", url: "https://example.com" }],
      libraries: [{ name: "SDK", platform: "Go", stargazers_count: 5 }],
    });
    expect(apiSchema.safeParse(migrated).success).toBe(true);
  });

  it("drops legacy is_free/is_active fields from output", () => {
    const migrated = migrateEntry({ ...base, is_free: true, is_active: true });
    expect(migrated).not.toHaveProperty("is_free");
    expect(migrated).not.toHaveProperty("is_active");
  });
});
