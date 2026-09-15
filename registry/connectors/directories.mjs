import {fetchJson, snapshot, safeUrl, string, object, date, limit, fail} from './common.mjs';

function optional(value, label, max = 1000) { return value == null ? null : string(value, label, max, true); }
function candidate(connector, record, fetched, sourceUrl) {
  object(record, 'directory record');
  if (connector === 'hol') {
    const metadata = {registry: string(record.registry, 'HOL registry', 100),
      original_id: optional(record.originalId, 'HOL originalId'), protocols: [], declared_endpoints: {}};
    if (record.protocols !== undefined) {
      if (!Array.isArray(record.protocols) || record.protocols.length > 40) fail('Invalid HOL protocols');
      metadata.protocols = record.protocols.map(p => string(p, 'protocol', 100));
    }
    if (record.endpoints !== undefined) {
      for (const [key, value] of Object.entries(object(record.endpoints, 'HOL endpoints'))) {
        if (Object.keys(metadata.declared_endpoints).length >= 20) fail('Too many declared endpoints');
        metadata.declared_endpoints[string(key, 'endpoint name', 100)] = string(value, 'endpoint data', 2000);
      }
    }
    if (record.available !== undefined) { if (typeof record.available !== 'boolean') fail('Invalid HOL available flag'); metadata.available_declared = record.available; }
    return snapshot({connector, external_id: string(record.uaid, 'HOL uaid', 1500), source_url: sourceUrl,
      author_declared: null, title: string(record.name, 'HOL name', 600), body: optional(record.description, 'HOL description', 10000) ?? '',
      updated_at: date(record.updatedAt), data_kind: 'directory-record', metadata}, fetched);
  }
  const publisher = record.publisher == null ? null : object(record.publisher, 'NANDA publisher');
  return snapshot({connector, external_id: string(record.org_id, 'NANDA org_id', 500), source_url: sourceUrl,
    author_declared: publisher ? optional(publisher.displayName, 'publisher') ?? optional(publisher.identifier, 'publisher ID', 2000) : null,
    title: string(record.display_name, 'NANDA display_name', 600), body: optional(record.description, 'NANDA description', 10000) ?? '',
    updated_at: date(record.updated_at), data_kind: 'directory-record',
    ...(record.version != null ? {revision: string(record.version, 'NANDA version', 300)} : {}),
    metadata: {identifier: optional(record.identifier, 'NANDA identifier', 2000), media_type: optional(record.media_type, 'NANDA media_type'),
      registry_url: optional(record.registry_url, 'NANDA registry_url', 2000), status_declared: optional(record.status, 'NANDA status')}} , fetched);
}

export async function discovery(config, options = {}) {
  object(config, 'operator configuration'); const url = safeUrl(config.url), count = limit(config.limit);
  if (url.search || url.hash) fail('Configure query/cursor separately from the discovery endpoint');
  const query = config.query === undefined ? '' : string(config.query, 'search query', 200).trim();
  if (config.connector === 'hol') {
    if (url.href !== 'https://hol.org/registry/api/v1/search') fail('Unsupported HOL discovery URL');
    let page = 1;
    if (config.cursor !== undefined && config.cursor !== null) {
      const cursor = object(config.cursor, 'HOL cursor');
      if (Object.keys(cursor).join(',') !== 'page' || !Number.isInteger(cursor.page) || cursor.page < 1 || cursor.page > 100) fail('HOL page must be 1-100');
      page = cursor.page;
    }
    if (query) url.searchParams.set('q', query);
    url.searchParams.set('limit', String(count)); url.searchParams.set('page', String(page));
    const fetched = await fetchJson(url.href, options), data = object(fetched.json);
    if (!Array.isArray(data.hits) || !Number.isInteger(data.total) || data.total < 0 || data.page !== page || data.limit !== count || data.hits.length > count) fail('Unexpected HOL search response');
    if (data.limited !== undefined && typeof data.limited !== 'boolean') fail('Invalid HOL limited flag');
    return {connector: 'hol', candidates: data.hits.map(record => candidate('hol', record, fetched, url.href)),
      next_cursor: data.hits.length === count && page * count < data.total && page < 100 ? {page: page + 1} : null,
      metadata: {fetched_at: fetched.fetched_at, raw_sha256: fetched.raw_sha256, total_reported: data.total,
        limited_reported: data.limited ?? null, exhaustive: false, page, limit: count, max_pages: 100,
        meaning: 'Directory records only; no returned endpoint has been followed and no agent was contacted.'}};
  }
  if (config.connector === 'nanda') {
    if (!['https://api.nandaindex.org/api/v1/search', 'https://api.nandaindex.org/api/v1/index'].includes(url.href)) fail('Unsupported NANDA discovery URL');
    if (config.cursor != null) fail('NANDA API has no cursor pagination');
    const search = url.pathname.endsWith('/search');
    if (search && query.length < 2 || !search && query) fail('NANDA search needs query length >=2; index accepts no query');
    if (search) url.searchParams.set('q', query);
    const fetched = await fetchJson(url.href, options), data = fetched.json;
    let records;
    if (search) {
      object(data);
      if (!Array.isArray(data.results) || data.count !== data.results.length || data.query !== query || data.results.length > 50) fail('Unexpected NANDA search response');
      records = data.results;
    } else { if (!Array.isArray(data)) fail('NANDA index must be an array'); records = data; }
    return {connector: 'nanda', candidates: records.slice(0, count).map(record => candidate('nanda', record, fetched, url.href)), next_cursor: null,
      metadata: {fetched_at: fetched.fetched_at, raw_sha256: fetched.raw_sha256, returned_by_provider: records.length,
        local_limit: count, locally_truncated: records.length > count, exhaustive: false,
        provider_search_limit: search ? 50 : null, pagination_supported: false,
        meaning: 'Index records may be catalogs, skills, cards or DNS pointers; no endpoint has been followed.'}};
  }
  fail('Unsupported directory connector');
}
