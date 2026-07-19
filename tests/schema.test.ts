import { describe, it, expect } from "vitest";
import { apiSchema } from "../cli/schema.js";

describe("apiSchema", () => {
  it("accepts minimal valid API and applies defaults", () => {
    const result = apiSchema.safeParse({ name: "Test", slug: "test", categories: ["Other"] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
      expect(result.data.pricing).toBe("unknown");
      expect(result.data.auth_type).toBe("unknown");
    }
  });

  it("accepts full API with all fields", () => {
    const result = apiSchema.safeParse({
      name: "YouTube",
      slug: "youtube",
      description: "Video API",
      categories: ["Video & Media"],
      type: "REST",
      status: "active",
      pricing: "freemium",
      auth_type: "oauth2",
      https: true,
      cors: "yes",
      base_url: "https://www.googleapis.com/youtube/v3",
      rate_limits: "10k units/day",
      tags: ["video", "google"],
      added: "2026-07-19",
      last_verified: "2026-07-19",
      specification: { type: "openapi", url: "https://example.com", version: "3.0" },
      links: [{ name: "Docs", url: "https://example.com" }],
      libraries: [{ name: "SDK", platform: "Node.js" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects API without name", () => {
    const result = apiSchema.safeParse({ slug: "test", categories: ["Other"] });
    expect(result.success).toBe(false);
  });

  it("rejects API with empty categories", () => {
    const result = apiSchema.safeParse({ name: "Test", slug: "test", categories: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug characters", () => {
    const result = apiSchema.safeParse({ name: "Test", slug: "Bad Slug!", categories: ["Other"] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum values", () => {
    expect(
      apiSchema.safeParse({ name: "T", slug: "t", categories: ["Other"], auth_type: "invalid" }).success,
    ).toBe(false);
    expect(
      apiSchema.safeParse({ name: "T", slug: "t", categories: ["Other"], pricing: "cheap" }).success,
    ).toBe(false);
    expect(
      apiSchema.safeParse({ name: "T", slug: "t", categories: ["Other"], status: "zombie" }).success,
    ).toBe(false);
  });

  it("rejects malformed dates", () => {
    const result = apiSchema.safeParse({
      name: "T",
      slug: "t",
      categories: ["Other"],
      last_verified: "19/07/2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null logo (dropped by compact on write)", () => {
    const result = apiSchema.safeParse({ name: "T", slug: "t", categories: ["Other"], logo: null });
    expect(result.success).toBe(true);
  });
});
