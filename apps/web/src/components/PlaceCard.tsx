import { Clock3, MapPin } from 'lucide-react';

import type { Place } from '@stray-city/shared';

import { categoryMeta, formatDateTime, placePhoto } from '../lib/format';
import { SampleBadge } from './SampleBadge';

export function PlaceCard({
  place,
  selected,
  distance,
  onClick,
}: {
  place: Place;
  selected: boolean;
  distance?: string;
  onClick: () => void;
}) {
  const meta = categoryMeta[place.category];
  return (
    <button className={`place-card ${selected ? 'place-card-selected' : ''}`} onClick={onClick}>
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-ink/5 sm:h-32 sm:w-36">
        <img src={placePhoto(place)} alt="" className="h-full w-full object-cover" />
        {place.isSample && <SampleBadge className="absolute left-2 top-2" />}
      </div>
      <div className="min-w-0 flex-1 py-1 text-left">
        <div className="flex items-start justify-between gap-3">
          <span className="category-label" style={{ color: meta.color }}>
            <span>{meta.icon}</span>
            {meta.label}
          </span>
          {distance && <span className="shrink-0 text-xs font-bold text-blue">{distance}</span>}
        </div>
        <h3 className="mt-2 truncate font-display text-xl font-bold">{place.name}</h3>
        <p className="mt-1 flex items-center gap-1 truncate text-sm text-ink/55">
          <MapPin size={13} />
          {place.neighborhood}, {place.borough}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {place.costVerified && place.costInfo && (
            <span className="micro-chip">{place.costInfo}</span>
          )}
          {place.eventStartsAt && (
            <span className="micro-chip">
              <Clock3 size={11} />
              {formatDateTime(place.eventStartsAt)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
