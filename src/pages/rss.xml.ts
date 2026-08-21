import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig } from '../site.config';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const sorted = articles.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site!,
    items: sorted.map((article) => ({
      title: article.data.titleJa || article.data.title,
      description: article.data.descriptionJa,
      pubDate: article.data.pubDate,
      link: `/games/${article.id}/`,
    })),
  });
}
