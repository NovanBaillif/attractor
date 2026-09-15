// Human-readable dates in Réunion time: "15 septembre 2026 à 19 h 15".
const long = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Indian/Reunion', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'});
const short = new Intl.DateTimeFormat('fr-FR', {timeZone: 'Indian/Reunion', day: 'numeric', month: 'long', year: 'numeric'});

export function quand(iso?: string | null): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'date inconnue';
  return long.format(new Date(iso)).replace(':', ' h ');
}
export function jour(iso?: string | null): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'date inconnue';
  return short.format(new Date(iso));
}

type Source = {id: string; name?: string; ecosystem?: string; url: string; summary?: string; relationship?: string;
  thread?: {mode: string; key: string; author?: string; role?: string}};
type Captured = {id: string | number; author: string; source_url: string; original_created_at?: string; revision?: string};

// One entry per imported message: latest captured version, with the French summary of its source.
export function messages(config: {sources: Source[]}, captured: {comments: Captured[]}) {
  const byKey = new Map<string, Captured[]>();
  for (const c of captured.comments) {
    const key = String(c.id);
    byKey.set(key, [...(byKey.get(key) || []), c]);
  }
  return config.sources.filter(s => s.thread?.mode === 'import').map(s => {
    const versions = byKey.get(s.thread!.key) || [];
    const first = versions[0];
    return {id: s.id, name: s.name || s.id, ecosystem: s.ecosystem || '', url: s.url, summary: s.summary || '',
      author: s.thread!.author || first?.author || 'inconnu', operator: s.thread!.role === 'operator',
      date: first?.original_created_at || null, revised: versions.length > 1,
      revisedAt: versions.length > 1 ? versions[versions.length - 1].revision || null : null};
  }).sort((a, b) => Date.parse(b.date || '0') - Date.parse(a.date || '0'));
}
