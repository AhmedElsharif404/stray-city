import type { Place } from '@stray-city/shared';

export interface SampleReview {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  accent: string;
  rating: number;
  text: string;
  visitNote: string;
}

export interface SampleProfileDetails {
  displayName: string;
  username: string;
  initials: string;
  accent: string;
  bio: string;
  homeBorough: string;
  joined: string;
  recentComments: Array<{ place: string; text: string; when: string }>;
  photos: Array<{ url: string; alt: string }>;
}

const profiles = [
  { displayName: 'Maya Chen', username: 'mayawanders', initials: 'MC', accent: '#4B73F2', homeBorough: 'Queens', joined: 'Spring 2025', bio: 'Museum mornings, long walks, and small places with a big story.' },
  { displayName: 'Jordan Reyes', username: 'boroughbites', initials: 'JR', accent: '#EF6658', homeBorough: 'The Bronx', joined: 'Summer 2025', bio: 'Always looking for an affordable plate and the block worth exploring after it.' },
  { displayName: 'Nia Thompson', username: 'niarambles', initials: 'NT', accent: '#7558E8', homeBorough: 'Brooklyn', joined: 'Winter 2024', bio: 'Public art, neighborhood history, and camera-roll-worthy side streets.' },
  { displayName: 'Samir Patel', username: 'citysamir', initials: 'SP', accent: '#2D438D', homeBorough: 'Manhattan', joined: 'Autumn 2024', bio: 'Finding quiet corners in a loud city, usually before the afternoon rush.' },
  { displayName: 'Elena Brooks', username: 'elenafinds', initials: 'EB', accent: '#F08A78', homeBorough: 'Staten Island', joined: 'Spring 2025', bio: 'Gardens, waterfront views, and places that reward taking the long way.' },
  { displayName: 'Theo Martin', username: 'theooutside', initials: 'TM', accent: '#3659C8', homeBorough: 'Brooklyn', joined: 'Summer 2024', bio: 'Parks, city trails, and low-key weekend adventures across all five boroughs.' },
];

const recentPlaces = [
  'Riverside walk',
  'Neighborhood café',
  'Community garden',
  'Independent gallery',
  'Pocket park',
  'Historic side street',
];

const reviewLines = [
  'A genuinely good stop when you want to slow down and notice a different side of the neighborhood.',
  'The atmosphere is the best part. Give yourself a little extra time instead of rushing through.',
  'Easy to add to a neighborhood walk, and it felt much less obvious than the usual tourist stops.',
  'I would bring a friend next time. There are enough small details here to make a second visit worthwhile.',
  'A relaxed local find with a strong sense of place. Earlier in the day was especially peaceful.',
  'Worth the detour. The surrounding blocks are fun to explore before or after the visit.',
  'A memorable little discovery that made the whole walk feel more personal.',
  'Good for a spontaneous stop—nothing complicated, just an enjoyable slice of the city.',
];

function hash(value: string): number {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7);
}

export function sampleReviewsForPlace(place: Pick<Place, 'id' | 'name'>): SampleReview[] {
  const seed = hash(`${place.id}:${place.name}`);
  return Array.from({ length: 3 }, (_, index) => {
    const profile = profiles[(seed + index * 2) % profiles.length]!;
    const rating = 4 + ((seed + index) % 2);
    return {
      id: `${place.id}-sample-review-${index}`,
      ...profile,
      rating,
      text: reviewLines[(seed + index * 3) % reviewLines.length]!,
      visitNote: index === 0 ? 'Visited this week' : index === 1 ? 'Visited 2 weeks ago' : 'Visited last month',
    };
  });
}

export function sampleProfileDetails(username: string): SampleProfileDetails | null {
  const profile = profiles.find((candidate) => candidate.username === username);
  if (!profile) return null;
  const seed = hash(username);
  return {
    ...profile,
    recentComments: Array.from({ length: 3 }, (_, index) => ({
      place: recentPlaces[(seed + index * 2) % recentPlaces.length]!,
      text: reviewLines[(seed + index * 3) % reviewLines.length]!,
      when: index === 0 ? '4 days ago' : index === 1 ? '2 weeks ago' : '1 month ago',
    })),
    photos: Array.from({ length: 3 }, (_, index) => ({
      url: `https://picsum.photos/seed/${encodeURIComponent(`city-stray-${username}-${index}`)}/700/700`,
      alt: `Sample photo ${index + 1} from ${profile.displayName}'s city walk`,
    })),
  };
}
