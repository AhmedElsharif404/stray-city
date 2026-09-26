import { Crosshair, LayoutList, Map as MapIcon, Navigation, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { PlaceFilters } from '@stray-city/shared';

import { FilterBar } from '../components/FilterBar';
import { MapView } from '../components/MapView';
import { PlaceCard } from '../components/PlaceCard';
import { PlacePanel } from '../components/PlacePanel';
import { distanceInMeters, formatDistance, getBrowserLocation, type Coordinates } from '../lib/geo';
import { useStrayCity } from '../lib/stray-city-context';

const initialFilters: PlaceFilters = {
  borough: '',
  neighborhood: '',
  categories: [],
  date: '',
  budgetOnly: false,
  query: '',
  vibeTags: [],
};

const vibes = [
  { label: 'Quiet reset', tags: ['quiet', 'garden'] },
  { label: 'Main character', tags: ['views', 'sunset'] },
  { label: 'Snack crawl', tags: ['food'] },
  { label: 'Play outside', tags: ['outdoors', 'playful'] },
  { label: 'Rain plan', tags: ['rainy-day', 'art'] },
];

export function ExplorePage() {
  const { places, loading, isDemoMode } = useStrayCity();
  const [filters, setFilters] = useState(initialFilters);
  const [selectedId, setSelectedIdState] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('place'),
  );
  const [view, setView] = useState<'map' | 'list'>('map');
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [locating, setLocating] = useState(false);

  const setSelectedId = (placeId: string | null) => {
    setSelectedIdState(placeId);
    const url = new URL(window.location.href);
    if (placeId) url.searchParams.set('place', placeId);
    else url.searchParams.delete('place');
    window.history.replaceState({}, '', url);
  };

  const boroughs = useMemo(
    () => [...new Set(places.map((place) => place.borough))].sort(),
    [places],
  );
  const neighborhoods = useMemo(
    () =>
      [
        ...new Set(
          places
            .filter((place) => !filters.borough || place.borough === filters.borough)
            .map((place) => place.neighborhood)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [filters.borough, places],
  );

  const filteredPlaces = useMemo(() => {
    const query = filters.query.toLowerCase().trim();
    return places
      .filter((place) => !filters.borough || place.borough === filters.borough)
      .filter((place) => !filters.neighborhood || place.neighborhood === filters.neighborhood)
      .filter((place) => !filters.categories.length || filters.categories.includes(place.category))
      .filter((place) => !filters.budgetOnly || (place.costVerified && Boolean(place.costInfo)))
      .filter((place) => {
        if (!filters.date) return true;
        if (!place.eventStartsAt) return false;
        return place.eventStartsAt.slice(0, 10) === filters.date;
      })
      .filter(
        (place) =>
          !filters.vibeTags.length || filters.vibeTags.some((tag) => place.tags.includes(tag)),
      )
      .filter(
        (place) =>
          !query ||
          [place.name, place.neighborhood, place.borough, place.cuisine, ...place.tags]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query),
      )
      .sort((a, b) => {
        if (!userLocation) return Number(b.hiddenGemVerified) - Number(a.hiddenGemVerified);
        return distanceInMeters(userLocation, a) - distanceInMeters(userLocation, b);
      });
  }, [filters, places, userLocation]);

  const selected = places.find((place) => place.id === selectedId) ?? null;
  const nowNear = useMemo(() => {
    if (!userLocation) return [];
    return places
      .map((place) => ({ place, distance: distanceInMeters(userLocation, place) }))
      .filter(
        ({ place, distance }) =>
          distance < 5000 &&
          (!place.eventEndsAt || new Date(place.eventEndsAt).getTime() > Date.now()),
      )
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [places, userLocation]);

  const locate = async () => {
    setLocating(true);
    setLocationMessage('');
    try {
      setUserLocation(await getBrowserLocation());
      setLocationMessage('Showing discoveries nearest to you.');
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Location unavailable.');
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-10">
      <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <p className="eyebrow">New York, less obvious</p>
            {isDemoMode && <span className="sample-badge">Sample discoveries</span>}
          </div>
          <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">
            Wander toward something <span className="text-coral">worth finding.</span>
          </h1>
        </div>
        <button
          className="button-primary shrink-0"
          onClick={() => void locate()}
          disabled={locating}
        >
          <Navigation size={18} />
          {locating ? 'Finding you…' : 'Near me'}
        </button>
      </section>

      <FilterBar
        filters={filters}
        boroughs={boroughs}
        neighborhoods={neighborhoods}
        onChange={setFilters}
      />

      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-violet">
          <Sparkles size={14} />
          Pick your vibe
        </span>
        {vibes.map((vibe) => {
          const active = vibe.tags.every((tag) => filters.vibeTags.includes(tag));
          return (
            <button
              key={vibe.label}
              className={`vibe-chip ${active ? 'vibe-chip-active' : ''}`}
              onClick={() => setFilters({ ...filters, vibeTags: active ? [] : vibe.tags })}
            >
              {vibe.label}
            </button>
          );
        })}
      </div>

      {locationMessage && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${userLocation ? 'bg-blue/10 text-blue' : 'bg-gold/15 text-ink'}`}
        >
          <Crosshair size={16} />
          {locationMessage}
        </div>
      )}

      {nowNear.length > 0 && (
        <section className="mt-6 rounded-[24px] bg-ink p-4 text-cream sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow !text-mint">Now & Near</p>
              <h2 className="mt-1 font-display text-2xl">Good ideas within reach</h2>
            </div>
            <span className="text-xs text-cream/50">live from your location</span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            {nowNear.map(({ place, distance }) => (
              <button
                key={place.id}
                onClick={() => setSelectedId(place.id)}
                className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-left transition hover:bg-white/15"
              >
                <img src={place.photos[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{place.name}</b>
                  <small className="text-cream/55">
                    {formatDistance(distance)} · {place.neighborhood}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink/55">
          {loading ? 'Loading the city…' : `${filteredPlaces.length} places to stray toward`}
        </p>
        <div className="flex rounded-full border border-ink/10 bg-white p-1 lg:hidden">
          <button
            className={`view-toggle ${view === 'map' ? 'view-toggle-active' : ''}`}
            onClick={() => setView('map')}
          >
            <MapIcon size={15} />
            Map
          </button>
          <button
            className={`view-toggle ${view === 'list' ? 'view-toggle-active' : ''}`}
            onClick={() => setView('list')}
          >
            <LayoutList size={15} />
            List
          </button>
        </div>
      </div>

      <div className="mt-3 grid min-h-[650px] gap-4 lg:grid-cols-[minmax(350px,0.78fr)_minmax(0,1.4fr)]">
        <div
          className={`${view === 'map' ? 'hidden lg:block' : 'block'} max-h-[calc(100vh-150px)] space-y-3 overflow-y-auto pr-1 scrollbar-soft`}
        >
          {filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              selected={selectedId === place.id}
              distance={
                userLocation ? formatDistance(distanceInMeters(userLocation, place)) : undefined
              }
              onClick={() => setSelectedId(place.id)}
            />
          ))}
          {!filteredPlaces.length && (
            <div className="rounded-3xl border border-dashed border-ink/20 p-10 text-center">
              <p className="font-display text-2xl">No matches on this block.</p>
              <p className="mt-2 text-sm text-ink/55">
                Clear a filter or try a nearby neighborhood.
              </p>
            </div>
          )}
        </div>
        <div
          className={`${view === 'list' ? 'hidden lg:block' : 'block'} sticky top-[92px] h-[calc(100vh-120px)] min-h-[650px]`}
        >
          <MapView
            places={filteredPlaces}
            selectedId={selectedId}
            userLocation={userLocation}
            onSelect={(place) => setSelectedId(place.id)}
          />
        </div>
      </div>

      {selected && <PlacePanel place={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
