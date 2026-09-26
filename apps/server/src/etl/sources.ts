import type { NormalizedPlaceInput } from '@stray-city/shared';

import { config } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { normalizePark, normalizeRestaurant, normalizeTicketmasterEvent } from './normalizers.js';

type UnknownRecord = Record<string, unknown>;

function nycHeaders(): HeadersInit {
  return config.NYC_OPEN_DATA_APP_TOKEN ? { 'X-App-Token': config.NYC_OPEN_DATA_APP_TOKEN } : {};
}

export async function fetchParks(limit: number): Promise<NormalizedPlaceInput[]> {
  const url = new URL('https://data.cityofnewyork.us/resource/enfh-gkve.json');
  url.searchParams.set('$limit', String(limit));
  url.searchParams.set('$where', 'latitude is not null and longitude is not null');
  const records = await fetchJson<UnknownRecord[]>(url, nycHeaders());
  return records
    .map(normalizePark)
    .filter((place): place is NormalizedPlaceInput => place !== null);
}

export async function fetchRestaurants(limit: number): Promise<NormalizedPlaceInput[]> {
  const url = new URL('https://data.cityofnewyork.us/resource/43nn-pn8j.json');
  url.searchParams.set('$limit', String(limit));
  url.searchParams.set('$order', 'inspection_date DESC');
  url.searchParams.set(
    '$where',
    'latitude is not null and longitude is not null and camis is not null',
  );
  const records = await fetchJson<UnknownRecord[]>(url, nycHeaders());
  const uniqueRestaurants = new Map<string, NormalizedPlaceInput>();
  for (const record of records) {
    const place = normalizeRestaurant(record);
    if (place && !uniqueRestaurants.has(place.external_id)) {
      uniqueRestaurants.set(place.external_id, place);
    }
  }
  return [...uniqueRestaurants.values()];
}

interface TicketmasterResponse {
  _embedded?: { events?: Array<Record<string, unknown>> };
}

export async function fetchTicketmasterEvents(limit: number): Promise<NormalizedPlaceInput[]> {
  if (!config.TICKETMASTER_API_KEY) {
    throw new Error('TICKETMASTER_API_KEY is required for Ticketmaster ETL.');
  }
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', config.TICKETMASTER_API_KEY);
  url.searchParams.set('city', 'New York');
  url.searchParams.set('stateCode', 'NY');
  url.searchParams.set('size', String(Math.min(limit, 200)));
  url.searchParams.set('sort', 'date,asc');
  const response = await fetchJson<TicketmasterResponse>(url);
  return (response._embedded?.events ?? [])
    .map(normalizeTicketmasterEvent)
    .filter((place): place is NormalizedPlaceInput => place !== null);
}
