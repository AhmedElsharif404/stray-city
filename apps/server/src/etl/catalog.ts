import { readFile } from 'node:fs/promises';

import type { NormalizedPlaceInput, PlaceCategory } from '@stray-city/shared';

import { config } from '../config.js';
import { deduplicateNormalizedPlaces } from './matching.js';
import { inferBorough, isWithinNyc } from './normalizers.js';

type UnknownRecord = Record<string, unknown>;

export interface ProviderPlace {
  provider: string;
  externalId: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  borough: string | null;
  neighborhood: string | null;
  description: string;
  cuisine: string | null;
  websiteUrl: string | null;
  openingHours: string | null;
  sourceUrl: string | null;
  rawPayload: UnknownRecord;
}

export interface PlaceProviderAdapter {
  readonly provider: 'osm_catalog';
  fetch(limit: number): Promise<ProviderPlace[]>;
}

const categoryMap: Record<string, PlaceCategory> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  bakery: 'bakery',
  bar: 'bar',
  museum: 'museum',
  gallery: 'gallery',
  arts_centre: 'gallery',
  theatre: 'theatre',
  cinema: 'cinema',
  library: 'library',
  books: 'bookstore',
  bookstore: 'bookstore',
  park: 'park',
  garden: 'garden',
  marketplace: 'market',
  market: 'market',
  attraction: 'attraction',
  viewpoint: 'viewpoint',
  artwork: 'public_art',
  public_art: 'public_art',
  monument: 'landmark',
  memorial: 'landmark',
  music_venue: 'music_venue',
};

function object(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function categoryFrom(tags: UnknownRecord): PlaceCategory | null {
  const taxonomy = object(tags.taxonomy);
  const hierarchy = Array.isArray(taxonomy.hierarchy) ? taxonomy.hierarchy : [];
  const candidates = [
    tags.amenity,
    tags.tourism,
    tags.leisure,
    tags.shop,
    tags.historic,
    tags.basic_category,
    taxonomy.primary,
    ...[...hierarchy].reverse(),
  ];
  for (const candidate of candidates) {
    const normalized = String(candidate ?? '').toLowerCase();
    const mapped =
      categoryMap[normalized] ??
      (normalized.includes('restaurant') ? 'restaurant' : null) ??
      (normalized.includes('cafe') || normalized.includes('coffee') ? 'cafe' : null) ??
      (normalized.includes('museum') ? 'museum' : null) ??
      (normalized.includes('gallery') ? 'gallery' : null) ??
      (normalized.includes('theater') || normalized.includes('theatre') ? 'theatre' : null) ??
      (normalized.includes('attraction') ? 'attraction' : null) ??
      (normalized.includes('landmark') ? 'landmark' : null);
    if (mapped) return mapped;
  }
  return null;
}

export function normalizeCatalogRecord(record: UnknownRecord): ProviderPlace | null {
  const properties = { ...object(record.tags), ...object(record.properties) };
  const names = object(record.names ?? properties.names);
  const addresses = Array.isArray(record.addresses ?? properties.addresses)
    ? ((record.addresses ?? properties.addresses) as unknown[])
    : [];
  const primaryAddress = object(addresses[0]);
  const geometry = object(record.geometry);
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  const center = object(record.center);
  const latitude = number(record.lat ?? center.lat ?? coordinates[1]);
  const longitude = number(record.lon ?? record.lng ?? center.lon ?? coordinates[0]);
  const externalId = text(record.id ?? properties.id);
  const name = text(properties.name ?? record.name ?? names.primary);
  const category = categoryFrom({
    ...properties,
    basic_category: record.basic_category ?? properties.basic_category,
    taxonomy: record.taxonomy ?? properties.taxonomy,
  });
  if (
    !externalId ||
    !name ||
    !category ||
    latitude === null ||
    longitude === null ||
    !isWithinNyc(latitude, longitude)
  )
    return null;

  const street = [properties['addr:housenumber'], properties['addr:street']]
    .filter(Boolean)
    .join(' ');
  const osmAddress =
    [street, properties['addr:city'], properties['addr:postcode']]
      .map(text)
      .filter(Boolean)
      .join(', ') || null;
  const address =
    [primaryAddress.freeform, primaryAddress.locality, primaryAddress.postcode]
      .map(text)
      .filter(Boolean)
      .join(', ') || osmAddress;
  const osmType = text(record.type) ?? 'node';
  const isOverture = record.theme === 'places' || record.type === 'place';
  const sourceUrl = isOverture
    ? 'https://overturemaps.org/'
    : `https://www.openstreetmap.org/${osmType}/${externalId.replace(/^\D+/, '')}`;
  const websites = Array.isArray(record.websites ?? properties.websites)
    ? ((record.websites ?? properties.websites) as unknown[])
    : [];

  return {
    provider: 'osm_catalog',
    externalId,
    name,
    category,
    latitude,
    longitude,
    address,
    borough: text(properties.borough ?? properties['addr:borough'] ?? primaryAddress.locality),
    neighborhood: text(properties.neighbourhood ?? properties['addr:suburb']),
    description: text(properties.description) ?? '',
    cuisine: text(properties.cuisine),
    websiteUrl: text(properties.website ?? properties['contact:website'] ?? websites[0]),
    openingHours: text(properties.opening_hours),
    sourceUrl,
    rawPayload: record,
  };
}

function toDatabasePlace(place: ProviderPlace): NormalizedPlaceInput {
  return {
    name: place.name,
    category: place.category,
    lat: place.latitude,
    lng: place.longitude,
    address: place.address,
    borough: place.borough ?? inferBorough(place.latitude, place.longitude),
    neighborhood: place.neighborhood,
    description: place.description,
    photos: [],
    local_tips: [],
    tags: [place.category],
    cuisine: place.cuisine,
    website_url: place.websiteUrl,
    phone: null,
    opening_hours: place.openingHours ? { text: place.openingHours } : null,
    sidequest_objective: null,
    cost_verified: false,
    cost_info: null,
    price_level: null,
    hidden_gem_verified: false,
    inspection_grade: null,
    inspection_score: null,
    inspection_date: null,
    event_starts_at: null,
    event_ends_at: null,
    source: 'osm_catalog',
    external_id: place.externalId,
    source_url: place.sourceUrl,
    source_payload: place.rawPayload,
    source_updated_at: null,
    is_active: true,
    is_sample: false,
  };
}

export const localCatalogAdapter: PlaceProviderAdapter = {
  provider: 'osm_catalog',
  async fetch(limit) {
    if (!config.CATALOG_DATA_PATH) {
      throw new Error(
        'CATALOG_DATA_PATH must point to a cached OSM or Overture GeoJSON/JSON export. Public Overpass endpoints are intentionally not queried.',
      );
    }
    const parsed = JSON.parse(await readFile(config.CATALOG_DATA_PATH, 'utf8')) as unknown;
    const root = object(parsed);
    const records = Array.isArray(parsed)
      ? parsed
      : Array.isArray(root.features)
        ? root.features
        : Array.isArray(root.elements)
          ? root.elements
          : [];
    return records
      .map((record) => normalizeCatalogRecord(object(record)))
      .filter(Boolean)
      .slice(0, limit) as ProviderPlace[];
  },
};

export async function fetchCatalog(limit: number): Promise<NormalizedPlaceInput[]> {
  return deduplicateNormalizedPlaces((await localCatalogAdapter.fetch(limit)).map(toDatabasePlace));
}
