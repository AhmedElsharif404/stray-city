import type { NormalizedPlaceInput } from '@stray-city/shared';

import { config } from '../config.js';
import { fetchJson } from '../lib/http.js';
import { normalizePark, normalizeRestaurant, normalizeTicketmasterEvent } from './normalizers.js';

type UnknownRecord = Record<string, unknown>;

function nycHeaders(): HeadersInit {
  return config.NYC_OPEN_DATA_APP_TOKEN ? { 'X-App-Token': config.NYC_OPEN_DATA_APP_TOKEN } : {};
}

export async function fetchParks(limit: number): Promise<NormalizedPlaceInput[]> {
  const records = await fetchSocrata(
    'enfh-gkve',
    limit,
    'multipolygon is not null',
  );
  return records
    .map(normalizePark)
    .filter((place): place is NormalizedPlaceInput => place !== null);
}

export async function fetchRestaurants(limit: number): Promise<NormalizedPlaceInput[]> {
  const records = await fetchSocrata(
    '43nn-pn8j',
    limit,
    'latitude is not null and longitude is not null and camis is not null',
    'inspection_date DESC',
  );
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
  page?: { totalPages?: number };
}

export async function fetchTicketmasterEvents(limit: number): Promise<NormalizedPlaceInput[]> {
  if (!config.TICKETMASTER_API_KEY) {
    throw new Error('TICKETMASTER_API_KEY is required for Ticketmaster ETL.');
  }
  const events: UnknownRecord[] = [];
  const pageSize = Math.min(limit, 200);
  for (let page = 0; events.length < limit; page += 1) {
    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    url.searchParams.set('apikey', config.TICKETMASTER_API_KEY);
    url.searchParams.set('city', 'New York');
    url.searchParams.set('stateCode', 'NY');
    url.searchParams.set('size', String(pageSize));
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'date,asc');
    const response = await fetchJson<TicketmasterResponse>(url);
    events.push(...(response._embedded?.events ?? []));
    if (page + 1 >= (response.page?.totalPages ?? 1)) break;
  }
  return events
    .slice(0, limit)
    .map(normalizeTicketmasterEvent)
    .filter((place): place is NormalizedPlaceInput => place !== null);
}

async function fetchSocrata(
  dataset: string,
  limit: number,
  where: string,
  order?: string,
): Promise<UnknownRecord[]> {
  const rows: UnknownRecord[] = [];
  const pageSize = Math.min(limit, 1000);
  for (let offset = 0; offset < limit; offset += pageSize) {
    const url = new URL(`https://data.cityofnewyork.us/resource/${dataset}.json`);
    url.searchParams.set('$limit', String(Math.min(pageSize, limit - offset)));
    url.searchParams.set('$offset', String(offset));
    url.searchParams.set('$where', where);
    if (order) url.searchParams.set('$order', order);
    const page = await fetchJson<UnknownRecord[]>(url, nycHeaders());
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
