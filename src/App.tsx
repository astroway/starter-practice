import { useMemo, useState, type FormEvent } from 'react';
import { REPORTS, SAMPLE_URL, type ReportSpec } from './reports';

/* A worked example, so the desk opens with a client in it rather than empty. */
const SAMPLE = {
  name: 'Ada Lovelace',
  city: 'London',
  date: '1815-12-10',
  time: '18:00:00',
  timezone: 'Europe/London',
  latitude: '51.5074',
  longitude: '-0.1278',
  partnerDate: '1792-12-26',
  partnerTime: '09:00:00',
  partnerTimezone: 'Europe/London',
  partnerLatitude: '51.5074',
  partnerLongitude: '-0.1278',
  windowStart: '2026-11-01',
  windowEnd: '2026-11-30',
  activity: 'marriage',
  spread: 'celtic-cross',
};

interface Rendered {
  slug: string;
  title: string;
  url: string;
  pages: number;
  bytes: number;
  expiresAt: string;
  credits: number | null;
}

function Field(props: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label}</span>
      <input
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.hint ? <span className="field-hint">{props.hint}</span> : null}
    </label>
  );
}

function hoursLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'expired';
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h} h left` : `${Math.max(1, Math.round(ms / 60_000))} min left`;
}

export function App() {
  const [input, setInput] = useState(SAMPLE);
  const [picked, setPicked] = useState<string>('tarot');
  const [brand, setBrand] = useState({ companyName: '', themeColor: '#2f6fb8', reportName: '' });
  const [useBrand, setUseBrand] = useState(false);
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const spec = useMemo<ReportSpec>(
    () => REPORTS.find((r) => r.slug === picked) ?? REPORTS[REPORTS.length - 1]!,
    [picked],
  );

  const set = (k: keyof typeof SAMPLE) => (v: string) => setInput((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      /* Our own server, never api.astroway.info. The key lives there and the
         browser could not reach the API directly even if it had one. */
      const res = await fetch(`${import.meta.env.BASE_URL}api/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...input,
          type: spec.slug,
          ...(useBrand && brand.companyName
            ? { whitelabel: { companyName: brand.companyName, themeColor: brand.themeColor, reportName: brand.reportName || undefined } }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Server answered ${res.status}.`);
      setRendered((list) => [{
        slug: spec.slug,
        title: spec.title,
        url: json.data.url,
        pages: json.data.page_count,
        bytes: json.data.byte_length,
        expiresAt: json.data.expires_at,
        credits: json.credits ?? null,
      }, ...list]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header>
        <h1>Report desk</h1>
        <p className="lede">
          Client details in, a finished PDF out. Sixteen reports under one prefix, a white-label
          block on every one of them, and the credit cost of each render shown next to it.
        </p>
        <ul className="endpoints">
          <li><code>POST /v1/reports/&lt;type&gt;</code></li>
        </ul>
      </header>

      <form onSubmit={submit}>
        <fieldset>
          <legend>Report</legend>
          <div className="reports">
            {REPORTS.map((r) => (
              <label key={r.slug} className={`report${picked === r.slug ? ' picked' : ''}`}>
                <input type="radio" name="report" value={r.slug} checked={picked === r.slug} onChange={() => setPicked(r.slug)} />
                <span className="report-title">{r.title}</span>
                <span className="report-cost">{r.cost.toLocaleString('en-GB')} cr</span>
                <a className="report-sample" href={SAMPLE_URL(r.slug)} target="_blank" rel="noreferrer">sample</a>
              </label>
            ))}
          </div>
          {spec.note ? <p className="field-hint">{spec.note}</p> : null}
        </fieldset>

        {spec.needs !== 'none' ? (
          <fieldset>
            <legend>Client</legend>
            <div className="grid">
              <Field label="Name" value={input.name} onChange={set('name')} placeholder="Ada Lovelace" />
              <Field label="City" hint="Printed on the report. Not geocoded." value={input.city} onChange={set('city')} placeholder="London" />
              <Field label="Date of birth" value={input.date} onChange={set('date')} type="date" />
              <Field label="Time of birth" value={input.time} onChange={set('time')} placeholder="18:00:00" />
              <Field label="Time zone" hint="IANA name. Do not compute an offset yourself." value={input.timezone} onChange={set('timezone')} placeholder="Europe/London" />
              <Field label="Latitude" value={input.latitude} onChange={set('latitude')} placeholder="51.5074" />
              <Field label="Longitude" value={input.longitude} onChange={set('longitude')} placeholder="-0.1278" />
            </div>
          </fieldset>
        ) : null}

        {spec.needs === 'twoCharts' ? (
          <fieldset>
            <legend>Partner</legend>
            <div className="grid">
              <Field label="Date of birth" value={input.partnerDate} onChange={set('partnerDate')} type="date" />
              <Field label="Time of birth" value={input.partnerTime} onChange={set('partnerTime')} placeholder="09:00:00" />
              <Field label="Time zone" value={input.partnerTimezone} onChange={set('partnerTimezone')} placeholder="Europe/London" />
              <Field label="Latitude" value={input.partnerLatitude} onChange={set('partnerLatitude')} />
              <Field label="Longitude" value={input.partnerLongitude} onChange={set('partnerLongitude')} />
            </div>
          </fieldset>
        ) : null}

        {spec.needs === 'window' ? (
          <fieldset>
            <legend>Search window</legend>
            <div className="grid">
              <Field label="Activity" hint="marriage, travel, business, and so on." value={input.activity} onChange={set('activity')} />
              <Field label="From" value={input.windowStart} onChange={set('windowStart')} type="date" />
              <Field label="To" value={input.windowEnd} onChange={set('windowEnd')} type="date" />
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend>
            <label className="inline-check">
              <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} />
              White-label
            </label>
          </legend>
          {useBrand ? (
            <>
              <div className="grid">
                <Field label="Company name" value={brand.companyName} onChange={(v) => setBrand((b) => ({ ...b, companyName: v }))} placeholder="Northgate Astrology" />
                <Field label="Report name" hint="Replaces our title on the cover." value={brand.reportName} onChange={(v) => setBrand((b) => ({ ...b, reportName: v }))} placeholder="Your Birth Chart" />
                <label className="field">
                  <span className="field-label">Theme colour</span>
                  <input type="color" value={brand.themeColor} onChange={(e) => setBrand((b) => ({ ...b, themeColor: e.target.value }))} />
                </label>
              </div>
              <p className="field-hint">
                Fifteen fields are available on the API. Three of them are here, because a starter
                that fills in fifteen inputs teaches nothing the first three do not.
              </p>
            </>
          ) : (
            <p className="field-hint">Off, so the PDF carries our name. Turn it on to put yours there instead.</p>
          )}
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? 'Rendering…' : `Render for ${spec.cost.toLocaleString('en-GB')} credits`}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {rendered.length ? (
        <section className="result">
          <h2>Rendered in this session</h2>
          <ul className="rendered">
            {rendered.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer">{r.title} PDF</a>
                <span className="meta">
                  {r.pages} {r.pages === 1 ? 'page' : 'pages'}
                  {' · '}{Math.round(r.bytes / 1024)} KB
                  {r.credits === 0
                    ? ' · served from cache, 0 credits'
                    : r.credits !== null ? ` · ${r.credits.toLocaleString('en-GB')} credits` : ''}
                </span>
                <span className="expiry" title={r.expiresAt}>{hoursLeft(r.expiresAt)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">
            A rendered PDF is deleted after a day. Download it, or store it yourself: the URL is
            not an archive and the API does not keep one for you. Rendering the same input twice
            returns the same file and costs nothing, because the response cache answers before
            the renderer does: a typo in a name is a new render, a second click is not.
          </p>
        </section>
      ) : null}

      <footer>
        <p>
          Built on the <a href="https://api.astroway.info">AstroWay API</a>.
          Source: <a href="https://github.com/astroway/starter-practice">astroway/starter-practice</a>.
        </p>
      </footer>
    </main>
  );
}
