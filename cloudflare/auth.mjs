// This is the only identity boundary for the standalone Worker. Client-supplied
// Sites identity headers are discarded before the existing APIs are called.
const jwksCache = new Map();
const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const decode = value => JSON.parse(new TextDecoder().decode(bytes(value)));
const problem = (message, status = 401) => Object.assign(new Error(message), {status});

export async function verifyAccessToken(token, env, fetcher = fetch) {
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN || '') || !env.ACCESS_AUD)
    throw problem('Cloudflare sign-in has not been configured yet.', 503);
  if (typeof token !== 'string' || token.length > 16000) throw problem('Sign in to oto to open your collection.');
  const pieces = token.split('.');
  if (pieces.length !== 3) throw problem('Your sign-in could not be verified.');
  let header, claims;
  try { header = decode(pieces[0]); claims = decode(pieces[1]); } catch { throw problem('Your sign-in could not be verified.'); }
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200 || header.crit ||
      claims.iss !== env.ACCESS_TEAM_DOMAIN || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD) ||
      !Number.isFinite(claims.exp) || claims.exp <= now || (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) ||
      typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 200 || typeof claims.email !== 'string')
    throw problem('Your sign-in expired or does not belong to this app.');
  let entry = jwksCache.get(claims.iss);
  const missing = !entry?.keys?.some(key => key.kid === header.kid);
  if (!entry || entry.expires < Date.now() || (missing && Date.now() - entry.fetched > 30000)) {
    const response = await fetcher(claims.iss + '/cdn-cgi/access/certs', {signal: AbortSignal.timeout(5000)});
    if (!response.ok) throw problem('Sign-in verification is temporarily unavailable.', 503);
    const data = await response.json();
    if (!Array.isArray(data.keys)) throw problem('Sign-in verification is temporarily unavailable.', 503);
    entry = {keys: data.keys, expires: Date.now() + 600000, fetched: Date.now()};
    if (jwksCache.size >= 8) jwksCache.delete(jwksCache.keys().next().value);
    jwksCache.set(claims.iss, entry);
  }
  const jwk = entry.keys.find(key => key.kid === header.kid && key.kty === 'RSA' && (!key.alg || key.alg === 'RS256'));
  if (!jwk) throw problem('Your sign-in could not be verified.');
  const key = await crypto.subtle.importKey('jwk', jwk, {name:'RSASSA-PKCS1-v1_5', hash:'SHA-256'}, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(pieces[2]), new TextEncoder().encode(pieces[0] + '.' + pieces[1])))
    throw problem('Your sign-in could not be verified.');
  return {id: 'access:' + claims.sub};
}

export async function authenticatedRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  const local = env.OTO_LOCAL_AUTH === 'true' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname) && ['8787','8788'].includes(url.port);
  const identity = local ? {id:'oto-local-developer'} : await verifyAccessToken(request.headers.get('cf-access-jwt-assertion'), env, fetcher);
  const headers = new Headers(request.headers);
  for (const key of [...headers.keys()]) if (key.startsWith('oai-authenticated-user-')) headers.delete(key);
  headers.set('oai-authenticated-user-id', identity.id);
  return new Request(request, {headers});
}
