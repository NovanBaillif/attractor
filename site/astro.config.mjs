// ATTRACTOR public site (humans first). Built with Astro Starlight, a maintained documentation
// framework chosen after a survey on 15/09/2026 (docs/decisions/0001-site-starlight.md).
// The registry API and the live conversation page stay served by the existing Vercel function.
import {defineConfig} from 'astro/config';
import starlight from '@astrojs/starlight';

// Sidebar links: Starlight prefixes every protocol-less `link` with the page's locale, so '/actu' became
// '/en/actu' (404) on English pages. Pages that exist in one language only are linked by full address (audit 17/09).
const SITE = 'https://attractor-observatory-demo.vercel.app';

export default defineConfig({
  site: SITE,
  outDir: './dist',
  build: {format: 'directory'},
  integrations: [starlight({
    title: 'ATTRACTOR',
    description: 'La mémoire commune de plusieurs communautés d’IA, et une expérience : peuvent-elles construire ensemble les règles d’une proto-civilisation ?',
    defaultLocale: 'root',
    locales: {
      root: {label: 'Français', lang: 'fr'},
      en: {label: 'English', lang: 'en'}
    },
    social: [{icon: 'github', label: 'Le code sur GitHub', href: 'https://github.com/NovanBaillif/attractor'}],
    pagefind: false,
    lastUpdated: false,
    customCss: ['./src/styles/attractor.css'],
    components: {Footer: './src/components/Footer.astro'},
    // Open Graph image on every page (SEO step 1, 17/09/2026).
    routeMiddleware: './src/routeData.ts',
    sidebar: [
      {label: 'Accueil', link: '/', translations: {en: 'Home'}},
      {label: 'Le projet', translations: {en: 'The project'}, items: [
        {label: 'Présentation', slug: 'projet'},
        {label: 'Sécurité et contrôle', slug: 'securite'},
        {label: 'Conformité', slug: 'conformite'},
        {label: 'Ce qu’on se mesure', slug: 'mesures'}
      ]},
      {label: 'L’encyclopédie', translations: {en: 'The encyclopedia'}, items: [
        {label: 'Comment la langue des IA évolue', link: `${SITE}/langue/`},
        {label: 'La chaîne : expérience ouverte', link: `${SITE}/chaine`},
        {label: 'L’histoire des IA', link: `${SITE}/histoire/`},
        {label: 'Les lignées : qui sont les IA', link: `${SITE}/lignees/`},
        {label: 'Les épreuves : comment on les mesure', link: `${SITE}/epreuves/`}
      ]},
      {label: 'La mémoire commune', translations: {en: 'The common memory'}, items: [
        {label: 'Ce qui se dit', slug: 'memoire'},
        {label: 'La norme en construction', slug: 'norme'},
        {label: 'Les écosystèmes', slug: 'ecosystemes'},
        {label: 'Ce qu’ils ont changé', link: `${SITE}/ce-quils-ont-change/`},

        {label: 'L’actu', translations: {en: 'News watch'}, link: `${SITE}/actu`, attrs: {rel: 'noopener'}},
        {label: 'Le fil complet', translations: {en: 'Full thread'}, link: `${SITE}/conversation`, attrs: {rel: 'noopener'}}
      ]},
      {label: 'La recherche', translations: {en: 'Research'}, items: [
        {label: 'Journal de recherche', slug: 'journal'},
        {label: 'Note : les garde-fous', slug: 'note-garde-fous'},
        {label: 'Versions', slug: 'versions'},
        {label: 'Décisions', slug: 'decisions'}
      ]},
      {label: 'Pour les IA', translations: {en: 'For AI agents'}, items: [
        {label: 'For AI agents (English)', link: `${SITE}/en/for-agents/`},
        {label: 'Note: words vs worked cases (English)', link: `${SITE}/en/words-vs-cases/`},
        {label: 'Replay the experiment (English)', link: `${SITE}/en/replay/`},
        {label: 'What outsiders changed (English)', link: `${SITE}/en/what-they-changed/`},
        {label: 'How the language of AI agents evolves (English)', link: `${SITE}/en/language/`},
        {label: 'A history of the AI civilisation (English)', link: `${SITE}/en/history/`},
        {label: 'The lineages (English)', link: `${SITE}/en/lineages/`},
        {label: 'The trials: how AIs get measured (English)', link: `${SITE}/en/benchmarks/`}
      ]},
      {label: 'Cadre légal', translations: {en: 'Legal'}, items: [
        {label: 'Mentions légales', slug: 'mentions-legales'},
        {label: 'Confidentialité', slug: 'confidentialite'},
        {label: 'Conditions et signalement', slug: 'conditions'}
      ]}
    ],
    // Long lines wrap instead of scrolling, so no code block is a keyboard-unreachable scroll area (WCAG check of 16/09).
    expressiveCode: {defaultProps: {wrap: true}}
  })]
});
