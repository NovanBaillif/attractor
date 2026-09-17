// One Open Graph image per page (the card shown when a link is shared), generated at build time by
// astro-og-canvas from each page's title and description. Added on 17/09/2026 (SEO, step 1).
import {getCollection} from 'astro:content';
import {OGImageRoute} from 'astro-og-canvas';

const entries = await getCollection('docs');
const pages = Object.fromEntries(entries.map(({id, data}) => [id, data]));

export const {getStaticPaths, GET} = await OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path, page) => ({
    // A splash page shows its hero title, which is what a visitor reads first.
    title: page.hero?.title ?? page.title,
    // Under a hero title, the first two sentences of the tagline carry the numbers; the description would repeat the title.
    description: page.hero?.tagline ? page.hero.tagline.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.') : page.description ?? '',
    bgGradient: [[23, 24, 28], [36, 38, 46]],
    border: {color: [74, 222, 128], width: 12, side: 'inline-start'},
    padding: 80,
    font: {
      title: {size: 64, weight: 'Bold', families: ['Noto Sans'], color: [255, 255, 255]},
      description: {size: 34, families: ['Noto Sans'], color: [203, 213, 225], lineHeight: 1.35}
    },
    fonts: [
      'https://api.fontsource.org/v1/fonts/noto-sans/latin-400-normal.ttf',
      'https://api.fontsource.org/v1/fonts/noto-sans/latin-700-normal.ttf'
    ]
  })
});
