# Report desk

A practitioner's report desk on the [AstroWay API](https://api.astroway.info): client details in, a finished white-labelled PDF out. Clone it, put a key in `.env`, run it.

**Live demo: [api.astroway.info/demo/practice/](https://api.astroway.info/demo/practice/)**

Sixteen reports live under one prefix, `POST /v1/reports/<type>`. Each returns a URL to a rendered PDF, its page count, its size and when it expires. Every one of them takes a `whitelabel` block, so the file that reaches your client carries your name and not ours.

## Run it

```bash
git clone https://github.com/astroway/starter-practice
cd starter-practice
npm install
cp .env.example .env     # put your key in it
npm run dev              # http://localhost:5173
```

Get a key at [api.astroway.info/dashboard/sign-up](https://api.astroway.info/dashboard/sign-up). Use an `aw_test_*` sandbox key while you build: it spends nothing.

For production:

```bash
npm run build
npm start                # http://localhost:5180, serves the built app and the API route
```

## Deploy it

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/astroway/starter-practice)

The button reads `render.yaml`: one Node web service on the free plan, built with `npm run build` and started with `npm start`. Render asks for `ASTROWAY_API_KEY` when you create it; the key stays on the server. Any host that runs Node 22 works the same way: build once, start, set the key.

## What costs what

Fifteen of the sixteen are 5,000 credits a render. The tarot spread is 100, because it has no ephemeris behind it. The tile for each report shows its price before you click, and the button says what the next render will cost.

**The hosted demo renders the tarot spread only.** `ALLOWED_REPORTS=tarot` in its environment, because a page on the open internet that will produce a 5,000-credit natal report for anyone spends a month's free tier in two clicks. Every tile still links a finished sample of that report, and your own copy renders all sixteen: leave `ALLOWED_REPORTS` empty.

## Four things worth copying

**A server route, not a browser fetch.** The browser cannot call `https://api.astroway.info/v1/*` directly: those responses carry no `access-control-allow-origin` header, so a fetch from your page fails on CORS before it fails on auth. `server/index.mjs` is the smallest honest route: no framework, no dependencies.

**Four request shapes, not sixteen.** Most reports take one chart. Synastry takes two. Muhurta takes a window and a place. Tarot takes neither. Getting that wrong is a 400 from the API, which is a fine way to find out and a poor way to ship, so `buildBody` states it once.

**Show the cost where the decision is.** The server returns `X-Credits-Used` to the page rather than only writing it to a log. A practitioner deciding whether to re-render after a typo should not have to open a dashboard to find out what the last one cost.

**The same input twice is free.** Render a report, then render it again unchanged: the URL is the same file and the second one costs 0 credits, because the response cache answers before the renderer does. A typo in a name is a new render; a second click is not. The page says so rather than printing a bare zero.

## The expiry is real

A rendered PDF is deleted after a day. The response carries `expires_at` and this page shows how long is left. The URL is not an archive: download the file, or put it in your own storage. The API does not keep one for you.

## White-label

The API takes fifteen white-label fields. Three of them are wired here, because a starter that fills in fifteen inputs teaches nothing the first three do not: `companyName`, `reportName` and `themeColor`. The rest are in the [reports documentation](https://api.astroway.info/products/reports-api/).

## Layout

Audited at 320, 375, 393, 430, 768, 1024 and 1440 px with a mechanical check for overflow, overlap, clipped text, contrast and tap targets, in both the default state and with the white-label panel open and a report rendered. Zero findings at all seven.

## Licence

MIT. Take it, change it, ship it.
