import type { Place, PlaceCategory } from '@stray-city/shared';

export const categoryMeta: Record<PlaceCategory, { label: string; color: string; icon: string }> = {
  sidequest: { label: 'Sidequest', color: '#7895F7', icon: '✦' },
  cheap_eat: { label: 'Cheap Eat', color: '#EF6658', icon: '$' },
  restaurant: { label: 'Restaurant', color: '#EF6658', icon: '●' },
  cafe: { label: 'Café', color: '#F2A096', icon: '☕' },
  popup_event: { label: 'Pop-up', color: '#EF6658', icon: '◷' },
  hidden_gem: { label: 'Hidden Gem', color: '#2D438D', icon: '◆' },
  park: { label: 'Park', color: '#4B73F2', icon: '♧' },
  landmark: { label: 'Landmark', color: '#18275C', icon: '⌂' },
  bakery: { label: 'Bakery', color: '#F2A096', icon: '◒' },
  bar: { label: 'Bar', color: '#2D438D', icon: '◐' },
  museum: { label: 'Museum', color: '#18275C', icon: '▣' },
  gallery: { label: 'Gallery', color: '#2D438D', icon: '◇' },
  theatre: { label: 'Theatre', color: '#EF6658', icon: '◫' },
  cinema: { label: 'Cinema', color: '#EF6658', icon: '▶' },
  library: { label: 'Library', color: '#4B73F2', icon: '▤' },
  bookstore: { label: 'Bookstore', color: '#4B73F2', icon: '▥' },
  garden: { label: 'Garden', color: '#7895F7', icon: '❧' },
  market: { label: 'Market', color: '#F2A096', icon: '▦' },
  attraction: { label: 'Attraction', color: '#EF6658', icon: '★' },
  viewpoint: { label: 'Viewpoint', color: '#4B73F2', icon: '◉' },
  public_art: { label: 'Public Art', color: '#EF6658', icon: '✹' },
  music_venue: { label: 'Music Venue', color: '#2D438D', icon: '♫' },
};

const categoryFallbackPhotos: Partial<Record<PlaceCategory, string>> = {
  park: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=82',
  garden: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=82',
  viewpoint: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82',
  restaurant: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=82',
  cheap_eat: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=82',
  cafe: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82',
  bakery: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82',
  museum: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=82',
  gallery: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=82',
  public_art: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1200&q=82',
  landmark: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=82',
  attraction: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=82',
  theatre: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=82',
  cinema: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=82',
  music_venue: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=1200&q=82',
};

const defaultFallbackPhoto =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82';

export function placePhoto(place: Pick<Place, 'category' | 'photos'>): string {
  return place.photos[0] ?? categoryFallbackPhotos[place.category] ?? defaultFallbackPhoto;
}

export function placeSummary(
  place: Pick<Place, 'borough' | 'category' | 'description' | 'name' | 'neighborhood'>,
): string {
  if (place.description.trim()) return place.description;
  const area = [place.neighborhood, place.borough].filter(Boolean).join(', ');
  return `${place.name} is a ${categoryMeta[place.category].label.toLowerCase()} to discover${area ? ` in ${area}` : ' in New York City'}.`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function timeAgo(value: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
