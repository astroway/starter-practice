/**
 * The whole backend: one route that holds the key and renders a report.
 *
 * Nothing here is clever, and that is the point. The browser cannot call
 * https://api.astroway.info/v1/* directly: those responses carry no
 * access-control-allow-origin header, so a fetch from your page fails on CORS
 * before it fails on auth. Every AstroWay app needs a server route, and this is
 * the smallest honest one. No framework, no dependencies.
 *
 * A report is the most expensive thing this API sells: fifteen of the sixteen
 * cost 5,000 credits each. So this route does two things the readers do not.
 * It refuses a report that is not on its own allowlist, and it says what a
 * render cost in the response rather than only in a log.
 *
 * In development Vite serves the UI on 5173 and proxies /api here.
 * In production this process serves the built files too.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 5180);
const BASE_URL = process.env.ASTROWAY_BASE_URL ?? 'https://api.astroway.info/v1';
const API_KEY = process.env.ASTROWAY_API_KEY ?? '';
const REPO = 'https://github.com/astroway/starter-practice';

/**
 * Which reports this instance will render, comma separated.
 *
 * Empty means all sixteen, which is what you want on your own key. The public
 * demo sets it to `tarot`: at 5,000 credits a render, a page on the open
 * internet that will generate a natal report for anyone spends a month's free
 * tier in two clicks. The page links the published sample for the rest, so the
 * layout is still there to look at.
 */
const ALLOWED = (process.env.ALLOWED_REPORTS ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean);

/* A demo on a public URL spends real credits on every visitor, so the same
   process that holds the key holds a ceiling. */
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_HOUR ?? 6);
const hits = new Map();

function rateLimited(ip) {
  if (RATE_LIMIT <= 0) return false;
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const list = (hits.get(ip) ?? []).filter((t) => now - t < hour);
  if (list.length >= RATE_LIMIT) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  return false;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    /* A client record plus a white-label block is under 2 KB. */
    if (chunks.reduce((n, c) => n + c.length, 0) > 8192) throw new Error('body too large');
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

/**
 * The body each report wants.
 *
 * Four shapes, not sixteen: most take one chart, synastry takes two, muhurta
 * takes a window and a place, tarot takes neither. Getting this wrong is a 400
 * from the API, which is a fine way to find out but a poor way to ship.
 */
function buildBody(type, input) {
  const chart = {
    name: input.name || undefined,
    date: input.date,
    time: input.time,
    timezone: input.timezone,
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    city: input.city || undefined,
  };
  const common = {
    language: input.language || 'en',
    ...(input.whitelabel ? { whitelabel: input.whitelabel } : {}),
  };
  if (type === 'tarot') {
    return { spread: input.spread || 'celtic-cross', name: input.name || 'Reading', allowReversed: true, ...common };
  }
  if (type === 'synastry') {
    return {
      chart1: chart,
      chart2: {
        date: input.partnerDate, time: input.partnerTime, timezone: input.partnerTimezone,
        latitude: Number(input.partnerLatitude), longitude: Number(input.partnerLongitude),
      },
      ...common,
    };
  }
  if (type === 'muhurta') {
    return {
      activity: input.activity || 'marriage',
      search_window_start: input.windowStart,
      search_window_end: input.windowEnd,
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
      timezoneOffset: Number(input.timezoneOffset ?? 0),
      topN: 10,
      ...common,
    };
  }
  if (type === 'relocation') {
    return { chart, locations: input.locations ?? [], ...common };
  }
  return { chart, ...common };
}

/** Fields that must be present for this report, so the refusal names ours. */
function missingFor(type, input) {
  if (type === 'tarot') return [];
  const base = ['date', 'time', 'timezone', 'latitude', 'longitude'];
  const need = type === 'synastry'
    ? [...base, 'partnerDate', 'partnerTime', 'partnerTimezone', 'partnerLatitude', 'partnerLongitude']
    : type === 'muhurta'
      ? ['windowStart', 'windowEnd', 'latitude', 'longitude']
      : base;
  return need.filter((k) => input[k] === undefined || input[k] === '' || input[k] === null);
}

async function handleReport(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, {
      error: 'ASTROWAY_API_KEY is not set. Copy .env.example to .env and put a key in it. '
        + 'Get one at https://api.astroway.info/dashboard/sign-up',
    });
  }

  let input;
  try {
    input = await readRequestBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Send a JSON body with a report type and the client details.' });
  }

  const type = String(input.type ?? '');
  if (!/^[a-z-]{3,24}$/.test(type)) {
    return sendJson(res, 400, { error: 'Pick a report.' });
  }
  if (ALLOWED.length && !ALLOWED.includes(type)) {
    return sendJson(res, 403, {
      error: `This instance renders ${ALLOWED.join(', ')} only, because the others cost 5,000 credits each. `
        + `A finished sample of every report is at https://api.astroway.info/samples/reports/${type}.pdf, and your own copy renders all sixteen: ${REPO}`,
    });
  }

  const ip = req.socket.remoteAddress ?? 'unknown';
  if (rateLimited(ip)) {
    return sendJson(res, 429, { error: `This instance allows ${RATE_LIMIT} reports an hour. Clone it and use your own key: ${REPO}` });
  }

  const missing = missingFor(type, input);
  if (missing.length) {
    return sendJson(res, 400, { error: `Missing: ${missing.join(', ')}.` });
  }

  const upstream = await fetch(`${BASE_URL}/reports/${type}`, {
    method: 'POST',
    headers: { 'X-Api-Key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(buildBody(type, input)),
  });
  const json = await upstream.json().catch(() => null);
  if (!upstream.ok || !json?.ok) {
    /* Pass the API's own words through. It knows why it refused and we do not,
       and rewriting the reason is how a caller ends up debugging our guess. */
    return sendJson(res, upstream.status === 200 ? 502 : upstream.status, {
      error: json?.error?.message ?? `AstroWay answered ${upstream.status}.`,
      code: json?.error?.code ?? null,
    });
  }

  const credits = upstream.headers.get('x-credits-used');
  console.log(JSON.stringify({ event: 'report', type, credits_used: credits, pages: json.data?.page_count }));

  /* The cost goes back to the page, not only into a log. A practitioner
     deciding whether to re-render for a typo should be able to see what the
     last one cost without opening a dashboard. */
  return sendJson(res, 200, {
    data: json.data,
    credits: credits ? Number(credits) : null,
    remaining: Number(upstream.headers.get('x-credits-remaining')) || null,
  });
}

async function serveStatic(res, pathname) {
  const rel = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, rel);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    /* A single-page app owns its routes: anything that is not a file is the
       app's own path, not a 404. */
    file = join(DIST, 'index.html');
  }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found. Run `npm run build` first, or `npm run dev` for the dev server.');
  }
}

/* Everything after the mount point. The demo runs behind nginx at
   /demo/practice/ and a plain `npm start` runs at the root. */
const MOUNT = (process.env.BASE_PATH ?? '/').replace(/\/+$/, '');

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = MOUNT && url.pathname.startsWith(MOUNT)
    ? url.pathname.slice(MOUNT.length) || '/'
    : url.pathname;
  if (pathname === '/api/report' && req.method === 'POST') {
    handleReport(req, res).catch((e) => sendJson(res, 500, { error: String(e?.message ?? e) }));
    return;
  }
  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, keyed: Boolean(API_KEY), allowed: ALLOWED.length ? ALLOWED : 'all' });
  }
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  void serveStatic(res, pathname);
});

server.listen(PORT, () => {
  console.log(JSON.stringify({
    event: 'started', port: PORT, base_url: BASE_URL, mount: MOUNT || '/',
    keyed: Boolean(API_KEY), allowed: ALLOWED.length ? ALLOWED : 'all',
  }));
});
