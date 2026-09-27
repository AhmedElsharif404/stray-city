import type { NormalizedPlaceInput, PlaceCategory } from '@stray-city/shared';

type UnknownRecord = Record<string, unknown>;

const boroughNames: Record<string, string> = {
  '1': 'Manhattan',
  '2': 'The Bronx',
  '3': 'Brooklyn',
  '4': 'Queens',
  '5': 'Staten Island',
  bronx: 'The Bronx',
  brooklyn: 'Brooklyn',
  manhattan: 'Manhattan',
  queens: 'Queens',
  'staten island': 'Staten Island',
};

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function borough(value: unknown): string {
  const raw = text(value)?.toLowerCase();
  return raw
    ? (boroughNames[raw] ?? raw.replace(/\b\w/g, (letter) => letter.toUpperCase()))
    : 'New York City';
}

function compactAddress(parts: unknown[]): string | null {
  const result = parts.map(text).filter(Boolean).join(' ');
  return result || null;
}

export function isWithinNyc(latitude: number, longitude: number): boolean {
  return (
    latitude >= 40.4774 && latitude <= 40.9176 && longitude >= -74.2591 && longitude <= -73.7002
  );
}

export function inferBorough(latitude: number, longitude: number): string {
  if (longitude < -74.05) return 'Staten Island';
  if (latitude > 40.79 && longitude > -73.94) return 'The Bronx';
  if (longitude > -73.93) return 'Queens';
  if (latitude < 40.74) return 'Brooklyn';
  return 'Manhattan';
}

export function normalizeMatchText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function basePlace(
  record: UnknownRecord,
  source: NormalizedPlaceInput['source'],
  externalId: string,
  category: PlaceCategory,
  name: string,
  lat: number,
  lng: number,
  placeBorough: string,
): NormalizedPlaceInput {
  return {
    name,
    category,
    lat,
    lng,
    address: null,
    borough: placeBorough,
    neighborhood: null,
    description: '',
    photos: [],
    local_tips: [],
    tags: [],
    cuisine: null,
    website_url: null,
    phone: null,
    opening_hours: null,
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
    source,
    external_id: externalId,
    source_url: null,
    source_payload: record,
    source_updated_at: null,
    is_active: true,
    is_sample: false,
  };
}

export function normalizePark(record: UnknownRecord): NormalizedPlaceInput | null {
  const externalId = text(record.gispropnum ?? record.property_id ?? record.objectid);
  const name = text(record.signname ?? record.name311 ?? record.name);
  const lat = number(record.latitude ?? record.lat);
  const lng = number(record.longitude ?? record.lon ?? record.lng);
  if (!externalId || !name || lat === null || lng === null || !isWithinNyc(lat, lng)) return null;

  const details = normalizeMatchText(
    [text(record.typecategory), text(record.description), name].filter(Boolean).join(' '),
  );
  const category: PlaceCategory = /playground|recreation|waterfront|public space/.test(details)
    ? 'attraction'
    : 'park';

  const normalized = basePlace(
    record,
    'nyc_parks',
    externalId,
    category,
    name,
    lat,
    lng,
    borough(record.borough ?? record.boro),
  );
  normalized.address = compactAddress([record.location, record.address]);
  normalized.description = text(record.description) ?? `A New York City park managed by NYC Parks.`;
  normalized.website_url = text(record.url);
  normalized.tags = ['outdoors', 'park', 'daytime'];
  normalized.source_url = text(record.url) ?? 'https://www.nycgovparks.org/parks';
  normalized.source_updated_at = text(record.last_modified ?? record.last_edited_date);
  return normalized;
}

export function normalizeRestaurant(record: UnknownRecord): NormalizedPlaceInput | null {
  const externalId = text(record.camis);
  const name = text(record.dba);
  const lat = number(record.latitude);
  const lng = number(record.longitude);
  if (
    !externalId ||
    !name ||
    lat === null ||
    lng === null ||
    (lat === 0 && lng === 0) ||
    !isWithinNyc(lat, lng)
  )
    return null;

  const cuisine = text(record.cuisine_description);
  const normalized = basePlace(
    record,
    'nyc_restaurant_inspection',
    externalId,
    'restaurant',
    name,
    lat,
    lng,
    borough(record.boro),
  );
  normalized.address = compactAddress([
    record.building,
    record.street,
    record.zipcode ? `NY ${String(record.zipcode)}` : null,
  ]);
  normalized.description = cuisine ? `${cuisine} restaurant.` : 'New York City restaurant.';
  normalized.cuisine = cuisine;
  normalized.phone = text(record.phone);
  normalized.tags = ['food', ...(cuisine ? [cuisine.toLowerCase()] : [])];
  normalized.inspection_grade = text(record.grade);
  normalized.inspection_score = number(record.score);
  normalized.inspection_date = text(record.inspection_date)?.slice(0, 10) ?? null;
  normalized.source_url = 'https://a816-health.nyc.gov/ABCEatsRestaurants/';
  normalized.source_updated_at = text(record.record_date);
  return normalized;
}

interface TicketmasterEvent extends UnknownRecord {
  id?: string;
  name?: string;
  url?: string;
  dates?: {
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    end?: { dateTime?: string };
  };
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  images?: Array<{ url?: string; width?: number }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      location?: { latitude?: string; longitude?: string };
      address?: { line1?: string };
      city?: { name?: string };
      state?: { stateCode?: string };
      postalCode?: string;
    }>;
  };
}

export function normalizeTicketmasterEvent(record: TicketmasterEvent): NormalizedPlaceInput | null {
  const venue = record._embedded?.venues?.[0];
  const externalId = text(record.id);
  const name = text(record.name);
  const lat = number(venue?.location?.latitude);
  const lng = number(venue?.location?.longitude);
  if (!externalId || !name || lat === null || lng === null || !isWithinNyc(lat, lng)) return null;

  const normalized = basePlace(
    record,
    'ticketmaster',
    externalId,
    'popup_event',
    name,
    lat,
    lng,
    inferBorough(lat, lng),
  );
  normalized.address = compactAddress([
    venue?.address?.line1,
    venue?.city?.name,
    venue?.state?.stateCode,
    venue?.postalCode,
  ]);
  normalized.description = venue?.name
    ? `At ${venue.name}.`
    : 'A limited-time event in New York City.';
  normalized.photos = [...(record.images ?? [])]
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
    .slice(0, 3)
    .map((image) => image.url)
    .filter((url): url is string => Boolean(url));
  normalized.tags = (record.classifications ?? [])
    .flatMap((item) => [item.segment?.name, item.genre?.name])
    .filter((tag): tag is string => Boolean(tag))
    .map((tag) => tag.toLowerCase());
  const start = record.dates?.start;
  normalized.event_starts_at =
    start?.dateTime ??
    (start?.localDate ? `${start.localDate}T${start.localTime ?? '12:00:00'}` : null);
  normalized.event_ends_at = record.dates?.end?.dateTime ?? null;
  normalized.source_url = text(record.url);
  normalized.website_url = text(record.url);
  return normalized;
}
