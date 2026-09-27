import { BadgeDollarSign, DatabaseZap, ExternalLink, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { PLACE_CATEGORIES } from '@stray-city/shared';

import { categoryMeta } from '../lib/format';
import { useStrayCity } from '../lib/stray-city-context';

export function AdminPage() {
  const { places, currentProfile, curatePlace, isDemoMode } = useStrayCity();
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const selected = places.find((place) => place.id === selectedId);

  if (currentProfile.role === 'member') {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-lg rounded-3xl border border-ink/10 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto text-coral" size={36} />
          <h1 className="mt-4 font-display text-3xl">Staff access required</h1>
          <p className="mt-2 text-ink/55">
            This page is protected by both the UI and Supabase role policies.
          </p>
        </div>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await curatePlace({
        placeId: String(data.get('placeId')),
        costVerified: data.get('costVerified') === 'on',
        costInfo: String(data.get('costInfo') ?? ''),
        priceLevel: data.get('priceLevel') ? Number(data.get('priceLevel')) : null,
        hiddenGemVerified: data.get('hiddenGemVerified') === 'on',
        category: String(data.get('category')) as (typeof PLACE_CATEGORIES)[number],
        sidequestObjective: String(data.get('sidequestObjective') ?? ''),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed.');
    }
  };

  const runEtl = async (source: string) => {
    const token = window.prompt('Enter the ETL admin token');
    if (!token) return;
    const response = await fetch(
      `${import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8787'}/api/etl/${source}?limit=500`,
      { method: 'POST', headers: { 'x-etl-token': token } },
    );
    if (!response.ok)
      setError(
        ((await response.json()) as { error?: { message?: string } }).error?.message ??
          'ETL failed.',
      );
  };

  return (
    <div className="page-shell">
      <section className="page-hero bg-ink text-white">
        <div>
          <p className="eyebrow !text-mint">Protected operations</p>
          <h1>Curate with receipts.</h1>
          <p>
            Verify costs manually, review source information, and trigger controlled ETL imports.
          </p>
        </div>
        <ShieldCheck className="hero-icon text-mint" />
      </section>
      {isDemoMode && (
        <p className="mt-5 rounded-2xl bg-gold/15 p-4 text-sm">
          Admin controls are interactive in demo mode, but changes remain local until Supabase and
          the server are configured.
        </p>
      )}
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <form
          key={selectedId}
          className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card"
          onSubmit={(event) => void submit(event)}
        >
          <div className="flex items-center gap-2 text-gold">
            <BadgeDollarSign />
            <p className="eyebrow !text-gold">Price verification</p>
          </div>
          <h2 className="mt-2 font-display text-3xl">Curate the catalog.</h2>
          <div className="mt-5 space-y-4">
            <label className="field-label">
              Search places
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name or neighborhood"
              />
            </label>
            <label className="field-label">
              Place
              <select
                name="placeId"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {places
                  .filter((place) =>
                    `${place.name} ${place.neighborhood ?? ''}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name}
                    </option>
                  ))}
              </select>
            </label>
            {selected && (
              <div className="rounded-2xl bg-ink/5 p-4">
                <p className="font-bold">{selected.name}</p>
                <p className="mt-1 text-sm text-ink/55">
                  {categoryMeta[selected.category].label} · {selected.neighborhood}
                </p>
                <p className="mt-2 text-xs">
                  Current:{' '}
                  {selected.costVerified
                    ? selected.costInfo
                    : 'Unverified — excluded from budget filters'}
                </p>
                {selected.sourceUrl && (
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue"
                  >
                    Open source <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
            <label className="field-label">
              Category
              <select name="category" defaultValue={selected?.category}>
                {PLACE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {categoryMeta[category].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input name="costVerified" type="checkbox" defaultChecked={selected?.costVerified} />
              Cost is manually verified
            </label>
            <label className="field-label">
              Verified cost description
              <input
                name="costInfo"
                defaultValue={selected?.costInfo ?? ''}
                placeholder="Most items $8–$14"
              />
            </label>
            <label className="field-label">
              Price level
              <select name="priceLevel" defaultValue={selected?.priceLevel ?? ''}>
                <option value="">Not set</option>
                <option value="1">$</option>
                <option value="2">$$</option>
                <option value="3">$$$</option>
                <option value="4">$$$$</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                name="hiddenGemVerified"
                type="checkbox"
                defaultChecked={selected?.hiddenGemVerified}
              />
              Hidden gem verified
            </label>
            <label className="field-label">
              Sidequest objective
              <textarea
                name="sidequestObjective"
                defaultValue={selected?.sidequestObjective ?? ''}
                placeholder="Find the mosaic tucked behind the garden wall."
              />
            </label>
            {error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
            <button className="button-primary w-full">Save curated place</button>
          </div>
        </form>
        <aside className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
          <div className="flex items-center gap-2 text-blue">
            <DatabaseZap />
            <p className="eyebrow !text-blue">External data</p>
          </div>
          <h2 className="mt-2 font-display text-3xl">Run an import.</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink/55">
            The Express server normalizes upstream records and logs every run. Ticketmaster requires
            its API key; NYC Open Data works without one but benefits from an app token.
          </p>
          <div className="mt-5 space-y-2">
            <button className="button-secondary w-full" onClick={() => void runEtl('nyc_parks')}>
              Sync NYC Parks
            </button>
            <button
              className="button-secondary w-full"
              onClick={() => void runEtl('nyc_restaurant_inspection')}
            >
              Sync inspections
            </button>
            <button className="button-secondary w-full" onClick={() => void runEtl('ticketmaster')}>
              Sync Ticketmaster
            </button>
            <button className="button-secondary w-full" onClick={() => void runEtl('osm_catalog')}>
              Sync base catalog
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink/45">
            Inspection records never set cost or hidden-gem fields. Only this manual flow can verify
            price.
          </p>
        </aside>
      </div>
    </div>
  );
}
