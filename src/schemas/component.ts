import { z } from "zod";

export const ComponentPropSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().default(false),
  default: z.any().optional(),
  description: z.string().optional(),
});

export const ComponentDependencySchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  dev: z.boolean().default(false),
});

export const ComponentFileSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(["component", "hook", "utility", "type"]).default("component"),
});

export const ComponentSchema = z.object({
  name: z
    .string()
    .regex(
      /^[a-z][a-z0-9-]*$/,
      "Component name must be lowercase, start with a letter, and contain only letters, numbers, and hyphens",
    ),
  displayName: z.string(),
  description: z.string(),
  category: z.string().default("ui"),
  version: z.string().default("1.0.0"),
  author: z.string().optional(),
  license: z.string().default("MIT"),

  // Component metadata
  props: z.array(ComponentPropSchema).default([]),
  dependencies: z.array(ComponentDependencySchema).default([]),
  peerDependencies: z.array(ComponentDependencySchema).default([]),

  // File structure
  files: z.array(ComponentFileSchema),

  // Documentation
  examples: z.array(z.string()).default([]),
  docs: z.string().optional(),

  // Configuration
  registryDependencies: z.array(z.string()).default([]),
  tailwind: z
    .object({
      config: z.record(z.any()).optional(),
      css: z.array(z.string()).default([]),
    })
    .optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  preview: z.string().optional(),

  // Validation flags
  private: z.boolean().default(false),
  deprecated: z.boolean().default(false),
  experimental: z.boolean().default(false),
});

export const ComponentRegistrySchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  author: z.string(),
  license: z.string(),
  repository: z.string(),
  homepage: z.string(),
  components: z.array(ComponentSchema),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  lastUpdated: z.string(),
});

export const ForgeConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().default("MIT"),
  repository: z.string().optional(),
  homepage: z.string().optional(),

  // Directories
  componentsDir: z.string().default("src/components"),
  outputDir: z.string().default("public"),

  // Registry settings
  registryUrl: z.string().optional(),
  tokenRequired: z.boolean().default(false),

  // Build settings
  typescript: z.boolean().default(true),
  tailwind: z.boolean().default(true),

  // Categories
  defaultCategory: z.string().default("ui"),
  categories: z
    .array(z.string())
    .default(["ui", "forms", "layout", "navigation"]),
});

export type Component = z.infer<typeof ComponentSchema>;
export type ComponentRegistry = z.infer<typeof ComponentRegistrySchema>;
export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;
export type ComponentProp = z.infer<typeof ComponentPropSchema>;
export type ComponentDependency = z.infer<typeof ComponentDependencySchema>;
export type ComponentFile = z.infer<typeof ComponentFileSchema>;
