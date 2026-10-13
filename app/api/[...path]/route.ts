import { env } from 'cloudflare:workers';
import { handleMusicRequest } from '../../../server/music-api.mjs';
import { handleProfileRequest } from '../../../server/profile-api.mjs';
import { handlePhoneRequest } from '../../../server/phone-api.mjs';
import { handleRadioRequest } from '../../../server/radio-api.mjs';
export const GET = (request: Request) => new URL(request.url).pathname.startsWith('/api/radio/') ? handleRadioRequest(request, env) : new URL(request.url).pathname.startsWith('/api/phone/') ? handlePhoneRequest(request, env) : new URL(request.url).pathname.startsWith('/api/profile/') ? handleProfileRequest(request, env) : handleMusicRequest(request, env);
export const HEAD = GET;
export const POST = GET;
