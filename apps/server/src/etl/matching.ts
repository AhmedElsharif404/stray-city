import type { NormalizedPlaceInput } from '@stray-city/shared';

import { normalizeMatchText } from './normalizers.js';

export interface MatchCandidate {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

export function distanceMeters(
  left: Pick<MatchCandidate, 'lat' | 'lng'>,
  right: Pick<MatchCandidate, 'lat' | 'lng'>,
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(right.lat - left.lat);
  const lngDelta = radians(right.lng - left.lng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(left.lat)) * Math.cos(radians(right.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function zipCode(value: string | null): string | null {
  return value?.match(/\b1\d{4}\b/)?.[0] ?? null;
}

export function findInspectionMatch(
  inspection: NormalizedPlaceInput,
  candidates: MatchCandidate[],
): MatchCandidate | null {
  const name = normalizeMatchText(inspection.name);
  const address = normalizeMatchText(inspection.address);
  const zip = zipCode(inspection.address);
  const named = candidates.filter((candidate) => normalizeMatchText(candidate.name) === name);

  return (
    named.find((candidate) => {
      const candidateZip = zipCode(candidate.address);
      return Boolean(
        zip && candidateZip && zip === candidateZip && distanceMeters(inspection, candidate) <= 600,
      );
    }) ??
    named.find(
      (candidate) =>
        Boolean(address && address === normalizeMatchText(candidate.address)) ||
        distanceMeters(inspection, candidate) <= 150,
    ) ??
    null
  );
}

export function deduplicateNormalizedPlaces(
  places: NormalizedPlaceInput[],
  radiusMeters = 40,
): NormalizedPlaceInput[] {
  const bySource = new Map<string, NormalizedPlaceInput>();
  const result: NormalizedPlaceInput[] = [];
  for (const place of places) {
    const identity = `${place.source}:${place.external_id}`;
    if (bySource.has(identity)) continue;
    const duplicate = result.some(
      (candidate) =>
        normalizeMatchText(candidate.name) === normalizeMatchText(place.name) &&
        distanceMeters(candidate, place) <= radiusMeters,
    );
    if (!duplicate) {
      bySource.set(identity, place);
      result.push(place);
    }
  }
  return result;
}
