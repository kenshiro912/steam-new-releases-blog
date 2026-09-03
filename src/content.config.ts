import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    titleJa: z.string().optional(),
    steamAppId: z.number(),
    sourceUrl: z.string().url(),
    descriptionJa: z.string(),
    price: z.string(),
    tags: z.array(z.string()),
    audienceJa: z.string(),
    editorNoteJa: z.string().optional(),
    releaseDate: z.string().optional(),
    heroImage: z.string().optional(),
    japaneseSupport: z.enum(['full', 'text', 'none']).optional(),
    pubDate: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
