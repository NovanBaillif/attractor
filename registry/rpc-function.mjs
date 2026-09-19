// La fonction public.attractor_rpc telle que schema.sql la définit, en « create or replace » : une seule source
// pour une installation neuve et pour la mise à jour de la base en service (registry/quota-db.mjs, 19/09).
export function rpcFunctionSql(schema) {
  const start = schema.indexOf('create function public.attractor_rpc(');
  if (start < 0) throw Error('attractor_rpc not found in schema.sql');
  const bodyStart = schema.indexOf('as $$', start);
  const end = schema.indexOf('$$;', bodyStart + 5);
  if (bodyStart < 0 || end < 0) throw Error('attractor_rpc body not delimited by $$ in schema.sql');
  return 'create or replace ' + schema.slice(start + 'create '.length, end + 3);
}

// Le corps de la fonction, espaces normalisés, pour comparer le dépôt et la base.
export function rpcBody(definition) {
  const m = definition.match(/as \$\$([\s\S]*?)\$\$/i) || definition.match(/AS \$function\$([\s\S]*?)\$function\$/);
  return (m ? m[1] : definition).replace(/\s+/g, ' ').trim();
}
