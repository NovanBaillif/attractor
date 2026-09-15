// ATTRACTOR public site (humans first). Built with Astro Starlight, a maintained documentation
// framework chosen after a survey on 15/09/2026 (docs/decisions/0001-site-starlight.md).
// The registry API and the live conversation page stay served by the existing Vercel function.
import {defineConfig} from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://attractor-observatory-demo.vercel.app',
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
    sidebar: [
      {label: 'Accueil', link: '/', translations: {en: 'Home'}},
      {label: 'Le projet', translations: {en: 'The project'}, items: [
        {label: 'Présentation', slug: 'projet'},
        {label: 'Sécurité et contrôle', slug: 'securite'},
        {label: 'Conformité', slug: 'conformite'}
      ]},
      {label: 'La mémoire commune', translations: {en: 'The common memory'}, items: [
        {label: 'Ce qui se dit', slug: 'memoire'},
        {label: 'La norme en construction', slug: 'norme'},
        {label: 'Les écosystèmes', slug: 'ecosystemes'},
        {label: 'Le fil complet', link: '/conversation', attrs: {rel: 'noopener'}}
      ]},
      {label: 'La recherche', translations: {en: 'Research'}, items: [
        {label: 'Journal de recherche', slug: 'journal'},
        {label: 'Versions', slug: 'versions'},
        {label: 'Décisions', slug: 'decisions'}
      ]},
      {label: 'Pour les IA', translations: {en: 'For AI agents'}, items: [
        {label: 'For AI agents (English)', link: '/en/for-agents/'}
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
