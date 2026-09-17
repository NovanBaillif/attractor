// Three more read-only directories, added on 17 September 2026 so that Attractor gathers what already exists
// instead of rebuilding a directory: the AGNTCY AI Catalog, the official MCP Registry and a2aregistry.org.
// Same bounds as HOL and NANDA: GET only, no returned endpoint is followed, no agent is contacted, no auto-paging.
import {fetchJson, snapshot, string, object, date, fail} from './common.mjs';

const optional = (value, label, max = 1000) => value == null ? null : string(value, label, max, true);
const flag = value => typeof value === 'boolean' ? value : null;
function count(value, label) {
  if (!Number.isInteger(value) || value < 0) fail('Invalid count: ' + label);
  return value;
}

export const AGNTCY_MEDIA_TYPES = ['application/a2a-agent-card+json', 'application/mcp-server-card+json',
  'application/agent-skills+md', 'application/agent-skills+gzip'];

// AGNTCY records carry the full card, about 32 KiB each: five of them already use most of the 256 KiB cap.
export async function agntcy(url, config, limit, options) {
  if (url.href !== 'https://ai-catalog.outshift.io/v1/agents') fail('Unsupported AGNTCY catalog URL');
  if (!AGNTCY_MEDIA_TYPES.includes(config.media_type)) fail('AGNTCY media_type must be one of the catalog collections');
  if (config.query) fail('AGNTCY catalog accepts a single filter: the collection type');
  if (limit > 5) fail('AGNTCY records are large: at most 5 per page');
  url.searchParams.set('filter', 'type=' + config.media_type);
  url.searchParams.set('pageSize', String(limit));
  if (config.cursor != null) url.searchParams.set('pageToken', string(config.cursor, 'AGNTCY page token', 200));
  const fetched = await fetchJson(url.href, options), data = object(fetched.json);
  if (!Array.isArray(data.results) || data.results.length > limit) fail('Unexpected AGNTCY catalog response');
  const total = count(data.totalCount, 'AGNTCY totalCount');
  const candidates = data.results.map(record => {
    object(record, 'AGNTCY record');
    const trust = record.metadata?.['agntcy.dir.trust.v1.Status'];
    return snapshot({connector: 'agntcy', external_id: string(record.identifier, 'AGNTCY identifier', 500), source_url: url.href,
      author_declared: null, title: string(record.displayName, 'AGNTCY displayName', 600),
      body: optional(record.description, 'AGNTCY description', 10000) ?? '', updated_at: date(record.updatedAt), data_kind: 'directory-record',
      ...(record.version != null ? {revision: string(String(record.version), 'AGNTCY version', 300)} : {}),
      metadata: {media_type: string(record.mediaType, 'AGNTCY mediaType', 200),
        trusted_reported: flag(trust?.trusted), verified_reported: flag(trust?.verified)}}, fetched);
  });
  const token = data.nextPageToken ? string(data.nextPageToken, 'AGNTCY nextPageToken', 200) : null;
  return {connector: 'agntcy', candidates, next_cursor: candidates.length === limit ? token : null,
    metadata: {fetched_at: fetched.fetched_at, raw_sha256: fetched.raw_sha256, total_reported: total, media_type: config.media_type,
      exhaustive: false, limit, meaning: 'Catalog records; card contents are not copied and no endpoint has been followed.'}};
}

export async function mcpRegistry(url, config, limit, options) {
  if (url.href !== 'https://registry.modelcontextprotocol.io/v0.1/servers') fail('Unsupported MCP Registry URL');
  const query = config.query ? string(config.query, 'search query', 200).trim() : '';
  if (query) url.searchParams.set('search', query);
  url.searchParams.set('limit', String(limit));
  if (config.cursor != null) url.searchParams.set('cursor', string(config.cursor, 'MCP cursor', 500));
  const fetched = await fetchJson(url.href, options), data = object(fetched.json);
  if (!Array.isArray(data.servers) || data.servers.length > limit) fail('Unexpected MCP Registry response');
  const meta = data.metadata == null ? {} : object(data.metadata, 'MCP metadata');
  const candidates = data.servers.map(entry => {
    const server = object(object(entry, 'MCP entry').server, 'MCP server');
    const official = entry._meta?.['io.modelcontextprotocol.registry/official'] ?? {};
    const name = string(server.name, 'MCP name', 300), version = string(server.version, 'MCP version', 100);
    const remotes = Array.isArray(server.remotes) ? server.remotes.slice(0, 20).map(r => ({
      type: optional(r?.type, 'MCP remote type', 100), url: optional(r?.url, 'MCP remote url', 2000)})) : [];
    return snapshot({connector: 'mcp-registry', external_id: `${name}@${version}`, source_url: url.href, author_declared: null,
      title: optional(server.title, 'MCP title', 600) ?? name, body: optional(server.description, 'MCP description', 10000) ?? '',
      updated_at: date(official.updatedAt), revision: version, data_kind: 'directory-record',
      metadata: {name, status_reported: optional(official.status, 'MCP status', 100), is_latest_reported: flag(official.isLatest),
        declared_remotes: remotes}}, fetched);
  });
  const next = meta.nextCursor ? string(meta.nextCursor, 'MCP nextCursor', 500) : null;
  return {connector: 'mcp-registry', candidates, next_cursor: candidates.length === limit ? next : null,
    metadata: {fetched_at: fetched.fetched_at, raw_sha256: fetched.raw_sha256, total_reported: null, exhaustive: false, limit,
      meaning: 'Server records, one per version; declared remotes are addresses, never contacted.'}};
}

export async function a2aRegistry(url, config, limit, options) {
  if (url.href !== 'https://a2aregistry.org/api/agents') fail('Unsupported a2aregistry URL');
  const query = config.query ? string(config.query, 'search query', 200).trim() : '';
  let offset = 0;
  if (config.cursor != null) {
    const cursor = object(config.cursor, 'a2aregistry cursor');
    if (Object.keys(cursor).join(',') !== 'offset' || !Number.isInteger(cursor.offset) || cursor.offset < 0 || cursor.offset > 10000) fail('a2aregistry offset must be 0-10000');
    offset = cursor.offset;
  }
  if (query) url.searchParams.set('search', query);
  if (config.healthy !== undefined) {
    if (config.healthy !== true) fail('a2aregistry healthy filter only accepts true');
    url.searchParams.set('healthy', 'true');
  }
  url.searchParams.set('limit', String(limit)); url.searchParams.set('offset', String(offset));
  const fetched = await fetchJson(url.href, options), data = object(fetched.json);
  if (!Array.isArray(data.agents) || data.agents.length > limit || data.limit !== limit || data.offset !== offset) fail('Unexpected a2aregistry response');
  const total = count(data.total, 'a2aregistry total');
  const candidates = data.agents.map(agent => {
    object(agent, 'a2aregistry agent');
    return snapshot({connector: 'a2aregistry', external_id: string(agent.id, 'a2aregistry id', 200), source_url: url.href,
      author_declared: optional(agent.author, 'a2aregistry author', 300), title: string(agent.name, 'a2aregistry name', 600),
      body: optional(agent.description, 'a2aregistry description', 10000) ?? '', updated_at: date(agent.updated_at), data_kind: 'directory-record',
      ...(agent.version != null ? {revision: string(String(agent.version), 'a2aregistry version', 100)} : {}),
      metadata: {agent_card_url: optional(agent.wellKnownURI, 'agent card URL', 2000), declared_endpoint: optional(agent.url, 'agent URL', 2000),
        protocol_version: optional(agent.protocolVersion, 'protocol version', 50), healthy_reported: flag(agent.is_healthy),
        last_health_check_reported: date(agent.last_health_check), conformance_reported: flag(agent.conformance)}}, fetched);
  });
  return {connector: 'a2aregistry', candidates, next_cursor: offset + limit < total && candidates.length === limit ? {offset: offset + limit} : null,
    metadata: {fetched_at: fetched.fetched_at, raw_sha256: fetched.raw_sha256, total_reported: total, exhaustive: false, offset, limit,
      meaning: 'Agent records; health values are the registry\'s own checks, not ours. No agent was contacted.'}};
}
