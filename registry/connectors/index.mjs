import {fetchJson, snapshot, safeUrl, string, object, date, fail} from './common.mjs';
export {ConnectorError} from './common.mjs';
export {discovery} from './directories.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export async function readSource(config, options = {}) {
  object(config, 'operator configuration');
  const source = safeUrl(config.url);
  if (config.connector === 'github-comment') {
    const path = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/issues\/([1-9]\d*)\/?$/.exec(source.pathname);
    const fragment = /^#issuecomment-([1-9]\d*)$/.exec(source.hash);
    if (source.hostname !== 'github.com' || source.search || !path || !fragment) fail('Expected a GitHub issue-comment permalink');
    const id = fragment[1], canonical = `https://github.com/${path[1]}/${path[2]}/issues/${path[3]}#issuecomment-${id}`;
    const fetched = await fetchJson(`https://api.github.com/repos/${path[1]}/${path[2]}/issues/comments/${id}`, options);
    const data = object(fetched.json);
    if (!Number.isSafeInteger(data.id) || String(data.id) !== id || data.html_url !== canonical) fail('GitHub comment identity does not match configured source');
    const author = data.user === null ? null : string(object(data.user, 'GitHub user').login, 'GitHub author', 100);
    return snapshot({connector: config.connector, external_id: id, source_url: canonical,
      author_declared: author, title: `GitHub ${path[1]}/${path[2]} · commentaire ${id}`,
      body: string(data.body, 'GitHub body', 80000, true), updated_at: date(data.updated_at, true), data_kind: 'contribution'}, fetched);
  }
  if (config.connector === 'moltbook-post') {
    const id = source.pathname.replace(/^\/post\//, '');
    if (!['www.moltbook.com', 'moltbook.com'].includes(source.hostname) || source.search || source.hash || !source.pathname.startsWith('/post/') || !uuid.test(id)) fail('Expected a Moltbook post permalink');
    const fetched = await fetchJson('https://www.moltbook.com/api/v1/posts/' + id, options);
    const envelope = object(fetched.json), data = object(envelope.post, 'Moltbook post');
    if (envelope.success !== true || data.id !== id || data.is_deleted === true) fail('Moltbook post unavailable or mismatched');
    return snapshot({connector: config.connector, external_id: id, source_url: 'https://www.moltbook.com/post/' + id,
      author_declared: data.author === null ? null : string(object(data.author, 'Moltbook author').name, 'Moltbook author', 300),
      title: string(data.title, 'Moltbook title', 600), body: string(data.content ?? '', 'Moltbook content', 80000, true),
      updated_at: date(data.updated_at, true), data_kind: 'contribution'}, fetched);
  }
  if (config.connector === 'http-json-artifact') {
    // This exact URL allowlist must come from operator configuration, never fetched content.
    if (source.hash || !Array.isArray(config.allowed_urls) || config.allowed_urls.length > 20 ||
      !config.allowed_urls.some(value => safeUrl(value).href === source.href)) fail('Artifact URL is not in the operator allowlist');
    const fetched = await fetchJson(source.href, options), data = object(fetched.json);
    let fields;
    if (data.specversion !== undefined) {
      if (data.specversion !== '1.0') fail('Unsupported CloudEvent version');
      const id = string(data.id, 'CloudEvent id', 500), eventSource = string(data.source, 'CloudEvent source', 2000);
      try { new URL(eventSource); } catch { fail('Expected absolute CloudEvent source URI'); }
      const detail = object(data.data, 'CloudEvent data'), type = string(data.type, 'CloudEvent type', 500);
      fields = {external_id: JSON.stringify([eventSource, id]), title: typeof detail.title === 'string' ? string(detail.title, 'event title', 600) : type,
        author_declared: detail.actor == null ? null : string(detail.actor, 'event actor', 2000),
        body: string(detail.body ?? detail.procedure ?? JSON.stringify(detail), 'event body', 80000, true), updated_at: date(data.time),
        metadata: {event_ref: {source: eventSource, id}, event_type: type}};
    } else {
      fields = {external_id: string(data.id, 'artifact id', 500), title: string(data.title, 'artifact title', 600),
        author_declared: data.author == null ? null : string(data.author, 'artifact author', 300),
        body: string(data.body, 'artifact body', 80000, true), updated_at: date(data.updated_at)};
      if (data.revision !== undefined) fields.revision = string(data.revision, 'artifact revision', 300);
    }
    return snapshot({connector: config.connector, source_url: source.href, ...fields, data_kind: 'contribution'}, fetched);
  }
  fail('Unsupported contribution connector');
}
