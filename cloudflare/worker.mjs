import {authenticatedRequest} from './auth.mjs';
import {handleMusicRequest} from '../server/music-api.mjs';
import {handleProfileRequest} from '../server/profile-api.mjs';
import {handlePhoneRequest} from '../server/phone-api.mjs';
import {handleRadioRequest} from '../server/radio-api.mjs';

export function publicConfig(env, origin) {
  let siteOrigin = '';
  try { const u = new URL(env.SITE_ORIGIN); if (u.protocol === 'https:' || (u.protocol === 'http:' && u.hostname === 'localhost')) siteOrigin = u.origin; } catch {}
  let pages = [];
  try { pages = JSON.parse(env.SITE_PAGES || '[]').filter(p => typeof p.label === 'string' && p.label.length <= 40 && typeof p.path === 'string' && p.path.startsWith('/') && !p.path.startsWith('//')).slice(0,12); } catch {}
  return {siteOrigin, pages, playerOrigin:origin, parentOrigins:[origin, ...(siteOrigin ? [siteOrigin] : [])]};
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/auth/login') return Response.redirect(url.origin+'/app/',302);
    if (url.pathname.startsWith('/api/')) {
      try {
        const verified = await authenticatedRequest(request, env);
        const handler = url.pathname.startsWith('/api/profile/') ? handleProfileRequest : url.pathname.startsWith('/api/phone/') ? handlePhoneRequest : url.pathname.startsWith('/api/radio/') ? handleRadioRequest : handleMusicRequest;
        return await handler(verified, env);
      } catch (error) {
        return Response.json({error:error.status ? error.message : 'Sign-in verification is temporarily unavailable.'}, {status:error.status || 503, headers:{'cache-control':'private, no-store'}});
      }
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
    const app = ['/app','/app/'].includes(url.pathname);
    const shell = ['/','/listen','/listen/'].includes(url.pathname);
    if (!app && !shell) return env.ASSETS.fetch(request);
    const assetURL = new URL(app ? '/app/index.html' : '/index.html', url);
    const response = await env.ASSETS.fetch(new Request(assetURL, request));
    if (!response.ok) return response;
    const config = publicConfig(env, url.origin);
    const html = (await response.text()).replace('</head>', '<script>window.OTO_CONFIG=' + JSON.stringify(config).replace(/</g,'\\u003c') + ';</script></head>');
    const headers = new Headers(response.headers);
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','private, no-store');
    headers.set('content-security-policy', "frame-ancestors 'self' " + (config.siteOrigin || '') + ';');
    headers.set('x-content-type-options','nosniff');
    headers.delete('etag'); headers.delete('content-length');
    return new Response(request.method === 'HEAD' ? null : html, {headers});
  }
};
