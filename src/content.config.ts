import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Metadata required on every chapter and prerequisite page (see CLAUDE.md § 3). */
const lessonSchema = z.object({
  /** Id of this page in src/content/curriculum.ts. */
  curriculumId: z.string(),
  title: z.string(),
  /** Short hook shown on the course map. */
  summary: z.string(),
  /** Display number in the curriculum, e.g. "1a" or "0.4". */
  number: z.string(),
  level: z.enum(['L3', 'M1', 'M2', 'beyond']),
  /** Estimated duration of active reading, in minutes. */
  duration: z.number().int().positive(),
  keyConcepts: z.array(z.string()).min(1),
  /** Curriculum ids (see src/content/curriculum.ts). */
  prerequisites: z.array(z.string()).default([]),
  /** Bibliography keys (src/content/references.ts) listed at the end of the page. */
  references: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

const chapitres = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/chapitres' }),
  schema: lessonSchema,
});

const prerequis = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: './src/content/prerequis' }),
  schema: lessonSchema,
});

const glossaire = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/glossaire' }),
  schema: z.object({
    term: z.string(),
    short: z.string(),
    seeAlso: z.array(reference('glossaire')).default([]),
  }),
});

export const collections = { chapitres, prerequis, glossaire };
