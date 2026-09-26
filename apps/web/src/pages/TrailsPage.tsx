import {
  Check,
  Clock3,
  LockKeyhole,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import type { Trail } from '@stray-city/shared';

import { SampleBadge } from '../components/SampleBadge';
import { getBrowserLocation } from '../lib/geo';
import { useStrayCity } from '../lib/stray-city-context';

export function TrailsPage() {
  const { trails, places, trailProgress, completeTrailStop, createTrail, isDemoMode } =
    useStrayCity();
  const [selected, setSelected] = useState<Trail | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState('');
  const [builderError, setBuilderError] = useState('');

  const buildTrail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBuilding(true);
    setBuilderError('');
    try {
      await createTrail({
        title: String(data.get('title')),
        description: String(data.get('description')),
        kind: data.get('kind') as Trail['kind'],
        visibility: data.get('visibility') as Trail['visibility'],
        estimatedMinutes: Number(data.get('estimatedMinutes')),
        placeIds: data.getAll('placeId').map(String).filter(Boolean),
      });
      form.reset();
      setBuilderOpen(false);
    } catch (caught) {
      setBuilderError(caught instanceof Error ? caught.message : 'Could not publish this trail.');
    } finally {
      setBuilding(false);
    }
  };

  const complete = async (trail: Trail) => {
    const position = (trailProgress[trail.id] ?? 0) + 1;
    const stop = trail.stops.find((item) => item.position === position);
    const place = places.find((item) => item.id === stop?.placeId);
    if (!place) return;
    setBusy(true);
    setError('');
    try {
      await completeTrailStop(trail, place, isDemoMode ? undefined : await getBrowserLocation());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not complete this stop.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-hero bg-violet text-white">
        <div>
          <p className="eyebrow !text-white/60">Curated ways through the city</p>
          <h1>Take the long way.</h1>
          <p>
            Follow a local route, build one with your Crew, or let a Mystery Trail reveal the city
            one clue at a time.
          </p>
        </div>
        <Route className="hero-icon" />
      </section>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <p className="eyebrow">Community routes</p>
          <h2 className="mt-1 font-display text-3xl">Choose your detour</h2>
        </div>
        <button className="button-secondary" onClick={() => setBuilderOpen(true)}>
          <Sparkles size={17} />
          Build a trail
        </button>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {trails.map((trail) => {
          const progress = trailProgress[trail.id] ?? 0;
          return (
            <button
              key={trail.id}
              className="group overflow-hidden rounded-[28px] border border-ink/10 bg-white text-left shadow-card transition hover:-translate-y-1"
              onClick={() => setSelected(trail)}
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={trail.coverPath ?? ''}
                  alt=""
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                <div className="absolute left-5 top-5 flex gap-2">
                  <span className="rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-ink">
                    {trail.kind === 'mystery' ? '✦ Mystery Trail' : '↝ Open Trail'}
                  </span>
                  {trail.isSample && <SampleBadge />}
                </div>
                <div className="absolute inset-x-5 bottom-5 text-white">
                  <h3 className="font-display text-3xl">{trail.title}</h3>
                  <div className="mt-2 flex gap-4 text-sm text-white/70">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {trail.stops.length} stops
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock3 size={14} />
                      {Math.round(trail.estimatedMinutes / 60)} hours
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-ink/65">{trail.description}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-mint transition-all"
                    style={{ width: `${(progress / trail.stops.length) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-ink/45">
                  {progress
                    ? `${progress} of ${trail.stops.length} complete`
                    : 'Ready when you are'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section
            className="modal-card max-w-2xl"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button absolute right-4 top-4"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
            <p className="eyebrow">
              {selected.kind === 'mystery' ? 'Mystery Trail' : 'Trail guide'}
            </p>
            <h2 className="mt-2 font-display text-4xl">{selected.title}</h2>
            <p className="mt-3 max-w-xl text-ink/60">{selected.description}</p>
            <div className="mt-6 space-y-3">
              {selected.stops.map((stop) => {
                const progress = trailProgress[selected.id] ?? 0;
                const completeStop = stop.position <= progress;
                const revealed = selected.kind === 'standard' || stop.position <= progress + 1;
                const place = places.find((item) => item.id === stop.placeId);
                return (
                  <div
                    key={stop.position}
                    className={`flex gap-4 rounded-2xl border p-4 ${revealed ? 'border-ink/10 bg-white' : 'border-transparent bg-ink/5'}`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold ${completeStop ? 'bg-mint text-ink' : revealed ? 'bg-coral text-white' : 'bg-ink/10 text-ink/35'}`}
                    >
                      {completeStop ? (
                        <Check size={17} />
                      ) : revealed ? (
                        stop.position
                      ) : (
                        <LockKeyhole size={15} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      {revealed ? (
                        <>
                          <h3 className="font-bold">
                            {selected.kind === 'mystery' && !completeStop ? stop.clue : place?.name}
                          </h3>
                          <p className="mt-1 text-sm text-ink/55">
                            {selected.kind === 'mystery' && !completeStop
                              ? 'The exact place appears when you arrive.'
                              : `${place?.neighborhood} · ${place?.borough}`}
                          </p>
                          {stop.objective && (
                            <p className="mt-2 text-sm font-medium text-violet">
                              Objective: {stop.objective}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="font-bold text-ink/35">Hidden stop</h3>
                          <p className="mt-1 text-sm text-ink/35">
                            Complete the previous clue to reveal this one.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
            {(trailProgress[selected.id] ?? 0) < selected.stops.length ? (
              <button
                className="button-primary mt-5 w-full"
                onClick={() => void complete(selected)}
                disabled={busy}
              >
                <Navigation size={18} />
                {busy
                  ? 'Checking your location…'
                  : isDemoMode
                    ? 'Complete sample step'
                    : 'I’m at this stop'}
              </button>
            ) : (
              <div className="mt-5 rounded-2xl bg-mint/20 p-5 text-center">
                <Check className="mx-auto text-mint" />
                <p className="mt-2 font-display text-2xl">Trail complete</p>
                <p className="text-sm text-ink/55">+30 Street Cred · share it with your Crew</p>
              </div>
            )}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink/45">
              <UsersRound size={14} />
              Complete with a friend to work toward Trail Duo.
            </p>
          </section>
        </div>
      )}

      {builderOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setBuilderOpen(false)}
        >
          <form
            className="modal-card max-w-xl"
            onSubmit={(event) => void buildTrail(event)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="icon-button absolute right-4 top-4"
              onClick={() => setBuilderOpen(false)}
              aria-label="Close trail builder"
            >
              <X size={18} />
            </button>
            <p className="eyebrow">Community trail builder</p>
            <h2 className="mt-2 font-display text-4xl">Connect the dots.</h2>
            <p className="mt-2 text-sm text-ink/55">
              Pick two or three stops in order. Mystery trails reveal only the next clue to other
              wanderers.
            </p>
            <div className="mt-6 space-y-4">
              <label className="field-label">
                Title
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder="A slow afternoon in Queens"
                />
              </label>
              <label className="field-label">
                Description
                <textarea
                  name="description"
                  required
                  maxLength={1000}
                  placeholder="What ties these stops together?"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field-label">
                  Trail type
                  <select name="kind" defaultValue="standard">
                    <option value="standard">Open trail</option>
                    <option value="mystery">Mystery trail</option>
                  </select>
                </label>
                <label className="field-label">
                  Who can see it
                  <select name="visibility" defaultValue="public">
                    <option value="public">Everyone</option>
                    <option value="crew">My Crew</option>
                    <option value="private">Only me</option>
                  </select>
                </label>
              </div>
              <label className="field-label">
                Estimated minutes
                <input
                  name="estimatedMinutes"
                  type="number"
                  min="30"
                  max="720"
                  defaultValue="120"
                  required
                />
              </label>
              {[1, 2, 3].map((position) => (
                <label className="field-label" key={position}>
                  Stop {position}
                  {position === 3 ? ' (optional)' : ''}
                  <select name="placeId" required={position < 3} defaultValue="">
                    <option value="">Choose a place</option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name} · {place.neighborhood}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              {builderError && (
                <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{builderError}</p>
              )}
              <button className="button-primary w-full" disabled={building}>
                <Sparkles size={17} />
                {building ? 'Publishing…' : 'Publish trail'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
