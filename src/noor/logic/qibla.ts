const KAABA = { lat: 21.4225, lng: 39.8262 };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle bearing from a location to the Kaaba, in degrees from true north. */
export function qiblaBearing(lat: number, lng: number): number {
  const φ = toRad(lat);
  const φk = toRad(KAABA.lat);
  const Δλ = toRad(KAABA.lng - lng);
  const θ = Math.atan2(
    Math.sin(Δλ),
    Math.cos(φ) * Math.tan(φk) - Math.sin(φ) * Math.cos(Δλ),
  );
  return (toDeg(θ) + 360) % 360;
}

/** Haversine distance to the Kaaba in kilometres. */
export function distanceToKaaba(lat: number, lng: number): number {
  const R = 6371;
  const dφ = toRad(KAABA.lat - lat);
  const dλ = toRad(KAABA.lng - lng);
  const a =
    Math.sin(dφ / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassPoint(bearing: number) {
  return POINTS[Math.round(bearing / 45) % 8];
}
