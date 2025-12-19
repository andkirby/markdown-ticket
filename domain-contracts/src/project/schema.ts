/**
 * MDT-101: Project Schema
 *
 * Zod schemas for Project interfaces from shared/models/Project.ts
 * This is a placeholder implementation - the actual schemas will be implemented as part of MDT-101
 */

import { z } from 'zod';

// Export placeholder schemas (will be implemented in MDT-101)
export const LocalProjectConfigSchema = z.object({
  project: z.object({
    id: z.string().optional(),
    name: z.string(),
    code: z.string(),
    path: z.string().optional(),
    startNumber: z.number(),
    counterFile: z.string(),
    active: z.boolean(),
    description: z.string().optional(),
    repository: z.string().optional(),
    ticketsPath: z.string().optional()
  }),
  document: z.object({
    paths: z.array(z.string()).optional(),
    excludeFolders: z.array(z.string()).optional(),
    maxDepth: z.number().optional()
  }).optional()
});

export const ProjectConfigSchema = LocalProjectConfigSchema;

export const ProjectSchema = z.object({
  id: z.string(),
  project: z.object({
    name: z.string(),
    path: z.string(),
    configFile: z.string(),
    active: z.boolean(),
    description: z.string().optional()
  }),
  metadata: z.object({
    dateRegistered: z.string(),
    lastAccessed: z.string(),
    version: z.string(),
    globalOnly: z.boolean().optional()
  }),
  autoDiscovered: z.boolean().optional(),
  configPath: z.string().optional(),
  registryFile: z.string().optional(),
  tickets: z.object({
    codePattern: z.string()
  }).optional(),
  document: z.object({
    paths: z.array(z.string()),
    excludeFolders: z.array(z.string()),
    maxDepth: z.number()
  }).optional()
});

// Type exports
export type LocalProjectConfig = z.infer<typeof LocalProjectConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type Project = z.infer<typeof ProjectSchema>;