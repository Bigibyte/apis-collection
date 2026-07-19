import { z } from "zod";

export const linkSchema = z.object({
  name: z.string(),
  url: z.url().optional(),
});

export const librarySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  documentation_url: z.string().optional(),
  source_code_url: z.string().optional(),
  version: z.string().optional(),
  platform: z.string().optional(),
  author: z.string().optional(),
  stargazers_count: z.number().int().optional(),
});

export const specificationSchema = z.object({
  type: z.string().optional(),
  url: z.string().optional(),
  version: z.string().optional(),
});

export const authType = z.enum(["none", "api_key", "oauth2", "bearer", "basic", "unknown"]);
export const pricingType = z.enum(["free", "freemium", "paid", "unknown"]);
export const statusType = z.enum(["active", "deprecated", "dead"]);
export const corsType = z.enum(["yes", "no", "unknown"]);

export const apiSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must contain only lowercase letters, digits and hyphens"),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1),
  type: z.string().optional(),
  status: statusType.default("active"),
  pricing: pricingType.default("unknown"),
  auth_type: authType.default("unknown"),
  https: z.boolean().optional(),
  cors: corsType.optional(),
  base_url: z.url().optional(),
  logo: z.url().nullish(),
  contact: z.string().optional(),
  discussion_url: z.url().optional(),
  rate_limits: z.string().optional(),
  tags: z.array(z.string()).optional(),
  added: z.iso.date().optional(),
  last_verified: z.iso.date().optional(),
  specification: specificationSchema.optional(),
  links: z.array(linkSchema).optional(),
  libraries: z.array(librarySchema).optional(),
});

export type Api = z.infer<typeof apiSchema>;
export type Link = z.infer<typeof linkSchema>;
export type Library = z.infer<typeof librarySchema>;
export type Specification = z.infer<typeof specificationSchema>;
export type AuthType = z.infer<typeof authType>;
export type Pricing = z.infer<typeof pricingType>;
export type Status = z.infer<typeof statusType>;

export const categorySchema = z.record(z.string(), z.string());
export type Categories = z.infer<typeof categorySchema>;
