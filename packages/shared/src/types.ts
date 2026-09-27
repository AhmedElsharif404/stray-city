export const PLACE_CATEGORIES = [
  'sidequest',
  'cheap_eat',
  'restaurant',
  'cafe',
  'popup_event',
  'hidden_gem',
  'park',
  'landmark',
  'bakery',
  'bar',
  'museum',
  'gallery',
  'theatre',
  'cinema',
  'library',
  'bookstore',
  'garden',
  'market',
  'attraction',
  'viewpoint',
  'public_art',
  'music_venue',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];
export type Borough = 'Manhattan' | 'Brooklyn' | 'Queens' | 'The Bronx' | 'Staten Island';
export type ModerationStatus = 'clean' | 'pending_review' | 'removed';
export type Audience = 'private' | 'crew' | 'public';
export type TrailKind = 'standard' | 'mystery';
export type LocationVisibility = 'hidden' | 'borough' | 'neighborhood' | 'exact';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address: string | null;
  borough: Borough | string;
  neighborhood: string | null;
  description: string;
  photos: string[];
  localTips: string[];
  tags: string[];
  cuisine: string | null;
  sidequestObjective: string | null;
  costVerified: boolean;
  costInfo: string | null;
  priceLevel?: number | null;
  hiddenGemVerified: boolean;
  inspectionGrade: string | null;
  inspectionScore: number | null;
  inspectionDate: string | null;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  source:
    | 'community'
    | 'admin'
    | 'nyc_parks'
    | 'nyc_restaurant_inspection'
    | 'ticketmaster'
    | 'osm_catalog';
  sourceUrl: string | null;
  isSample: boolean;
}

export interface PlaceFilters {
  borough: string;
  neighborhood: string;
  categories: PlaceCategory[];
  date: string;
  budgetOnly: boolean;
  query: string;
  vibeTags: string[];
}

export interface TrailStop {
  placeId: string;
  position: number;
  clue: string | null;
  objective: string | null;
}

export interface Trail {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  kind: TrailKind;
  visibility: Audience;
  tags: string[];
  estimatedMinutes: number;
  coverPath: string | null;
  stops: TrailStop[];
  isSample: boolean;
}

export interface Echo {
  id: string;
  placeId: string;
  userId: string;
  username: string;
  photoPath: string;
  text: string;
  reactionCount: number;
  createdAt: string;
  unlocked: boolean;
  moderationStatus: ModerationStatus;
  isSample: boolean;
}

export interface ScrapbookItem {
  id: string;
  placeId: string;
  userId: string;
  username: string;
  photoPath: string | null;
  tip: string | null;
  createdAt: string;
  isSample: boolean;
}

export interface CrewMember {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  nearbyDistanceM?: number;
  weeklyPoints: number;
  isSample: boolean;
}

export interface OpenPlan {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  note: string | null;
  startsAt: string;
  endsAt: string;
  visibility: Audience;
  locationVisibility: LocationVisibility;
  placeId: string | null;
  placeName: string | null;
  borough: string | null;
  neighborhood: string | null;
  goingCount: number;
  isSample: boolean;
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  mediaPath: string;
  mediaKind: 'photo' | 'video';
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  placeId: string | null;
  placeName: string | null;
  borough: string | null;
  neighborhood: string | null;
  isSample: boolean;
}

export interface Badge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  awardedAt: string | null;
}

export interface LeaderboardEntry extends CrewMember {
  rank: number;
}

export interface NormalizedPlaceInput {
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address: string | null;
  borough: string;
  neighborhood: string | null;
  description: string;
  photos: string[];
  local_tips: string[];
  tags: string[];
  cuisine: string | null;
  website_url: string | null;
  phone: string | null;
  opening_hours: Record<string, unknown> | null;
  sidequest_objective: string | null;
  cost_verified: boolean;
  cost_info: string | null;
  price_level: number | null;
  hidden_gem_verified: boolean;
  inspection_grade: string | null;
  inspection_score: number | null;
  inspection_date: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  source: Place['source'];
  external_id: string;
  source_url: string | null;
  source_payload: Record<string, unknown>;
  source_updated_at: string | null;
  is_active: boolean;
  is_sample: boolean;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}
