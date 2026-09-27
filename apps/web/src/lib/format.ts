import type { PlaceCategory } from '@stray-city/shared';

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
