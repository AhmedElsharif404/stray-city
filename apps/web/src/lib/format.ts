import type { PlaceCategory } from '@stray-city/shared';

export const categoryMeta: Record<PlaceCategory, { label: string; color: string; icon: string }> = {
  sidequest: { label: 'Sidequest', color: '#55989C', icon: '✦' },
  cheap_eat: { label: 'Cheap Eat', color: '#E9A066', icon: '$' },
  restaurant: { label: 'Restaurant', color: '#E9A066', icon: '●' },
  cafe: { label: 'Café', color: '#E9A066', icon: '☕' },
  popup_event: { label: 'Pop-up', color: '#EE7B5C', icon: '◷' },
  hidden_gem: { label: 'Hidden Gem', color: '#3D6077', icon: '◆' },
  park: { label: 'Park', color: '#55989C', icon: '♧' },
  landmark: { label: 'Landmark', color: '#3D6077', icon: '⌂' },
  bakery: { label: 'Bakery', color: '#E9A066', icon: '◒' },
  bar: { label: 'Bar', color: '#3D6077', icon: '◐' },
  museum: { label: 'Museum', color: '#3D6077', icon: '▣' },
  gallery: { label: 'Gallery', color: '#3D6077', icon: '◇' },
  theatre: { label: 'Theatre', color: '#EE7B5C', icon: '◫' },
  cinema: { label: 'Cinema', color: '#EE7B5C', icon: '▶' },
  library: { label: 'Library', color: '#2F6575', icon: '▤' },
  bookstore: { label: 'Bookstore', color: '#2F6575', icon: '▥' },
  garden: { label: 'Garden', color: '#55989C', icon: '❧' },
  market: { label: 'Market', color: '#E9A066', icon: '▦' },
  attraction: { label: 'Attraction', color: '#EE7B5C', icon: '★' },
  viewpoint: { label: 'Viewpoint', color: '#2F6575', icon: '◉' },
  public_art: { label: 'Public Art', color: '#EE7B5C', icon: '✹' },
  music_venue: { label: 'Music Venue', color: '#3D6077', icon: '♫' },
};

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
