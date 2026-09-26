import type { PlaceCategory } from '@stray-city/shared';

export const categoryMeta: Record<PlaceCategory, { label: string; color: string; icon: string }> = {
  sidequest: { label: 'Sidequest', color: '#6CC9A5', icon: '✦' },
  cheap_eat: { label: 'Cheap Eat', color: '#E7AC3A', icon: '$' },
  restaurant: { label: 'Restaurant', color: '#E7AC3A', icon: '●' },
  cafe: { label: 'Café', color: '#E7AC3A', icon: '☕' },
  popup_event: { label: 'Pop-up', color: '#F06A4D', icon: '◷' },
  hidden_gem: { label: 'Hidden Gem', color: '#7465B2', icon: '◆' },
  park: { label: 'Park', color: '#6CC9A5', icon: '♧' },
  landmark: { label: 'Landmark', color: '#7465B2', icon: '⌂' },
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
