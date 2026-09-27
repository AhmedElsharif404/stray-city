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

const profiles = [
  { displayName: 'Maya Chen', username: 'mayawanders', initials: 'MC', accent: '#4B73F2' },
  { displayName: 'Jordan Reyes', username: 'boroughbites', initials: 'JR', accent: '#EF6658' },
  { displayName: 'Nia Thompson', username: 'niarambles', initials: 'NT', accent: '#7558E8' },
  { displayName: 'Samir Patel', username: 'citysamir', initials: 'SP', accent: '#2D438D' },
  { displayName: 'Elena Brooks', username: 'elenafinds', initials: 'EB', accent: '#F08A78' },
  { displayName: 'Theo Martin', username: 'theooutside', initials: 'TM', accent: '#3659C8' },
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
