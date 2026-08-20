import type { CollectionEntry } from 'astro:content';

export function sortArticles(articles: CollectionEntry<'articles'>[]) {
  return [...articles].sort((a, b) => {
    const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
    if (dateDiff !== 0) return dateDiff;
    return b.data.steamAppId - a.data.steamAppId;
  });
}
