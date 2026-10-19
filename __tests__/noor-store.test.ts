import type { Place } from '../src/noor/data/places';
import { AppState, withPlace } from '../src/noor/store';

const place = (countryCode: string, name = 'X'): Place => ({
  name,
  country: '',
  countryCode,
  lat: 0,
  lng: 0,
  utcOffset: 0,
  source: 'gps',
});

const base = {
  place: null,
  method: 'makkah',
  madhab: 'standard',
} as unknown as AppState;

test('a new country applies its calculation defaults', () => {
  const s = withPlace(base, place('PK', 'Lahore'));
  expect(s).toMatchObject({ method: 'karachi', madhab: 'hanafi' });
});

test("moving within the same country keeps the user's own choices", () => {
  const custom = {
    ...withPlace(base, place('PK', 'Lahore')),
    method: 'mwl',
    madhab: 'standard',
  } as AppState;
  const moved = withPlace(custom, place('PK', 'Karachi'));
  expect(moved.place?.name).toBe('Karachi');
  expect(moved).toMatchObject({ method: 'mwl', madhab: 'standard' });
});
