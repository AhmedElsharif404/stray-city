export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function distanceInMeters(a: Coordinates, b: Coordinates): number {
  const radius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const firstLat = toRadians(a.lat);
  const secondLat = toRadians(b.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getBrowserLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser does not support geolocation.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }),
      (error) => {
        const messages: Record<number, string> = {
          1: 'Location permission was denied. Use the map and neighborhood filters instead.',
          2: 'Your location is currently unavailable.',
          3: 'Finding your location took too long. Please try again.',
        };
        reject(new Error(messages[error.code] ?? 'Could not find your location.'));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 50) * 50} m`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}
