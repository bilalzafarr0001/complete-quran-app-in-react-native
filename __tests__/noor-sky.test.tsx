import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SkyScene } from '../src/noor/components/SkyScene';
import type { DayPhase } from '../src/noor/logic/prayerTimes';
import type { SkyWeather } from '../src/noor/logic/weather';

jest.useFakeTimers();

/** The full-screen sky layers (gradients) a scene paints, with opacity. */
function layers(
  phase: DayPhase,
  weather: SkyWeather | null,
  cloud: number | null,
  sunny = 0,
) {
  let r!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    r = ReactTestRenderer.create(
      <SkyScene
        phase={phase}
        sun={0.7}
        band={{ top: 0, height: 76 }}
        weather={weather}
        cloud={cloud}
        sunny={sunny}
        still
      />,
    );
  });
  const out = r.root
    .findAll(n => (n.type as unknown) === 'View')
    .map(n => [n.props.style].flat(Infinity).filter(Boolean))
    .map(styles => Object.assign({}, ...styles))
    .filter(s => typeof s.backgroundImage === 'string' && s.top === 0)
    .map(s => ({ bg: s.backgroundImage as string, opacity: s.opacity }));
  ReactTestRenderer.act(() => r.unmount());
  return out;
}
const has = (l: ReturnType<typeof layers>, colour: string) =>
  l.find(x => x.bg.includes(colour));

describe('the sky is lighter or darker with the weather', () => {
  test('a sunny day takes on the Five Skies warm sky', () => {
    expect(has(layers('afternoon', 'clear', 0, 1), '#9E3F1E')?.opacity).toBe(1);
    expect(has(layers('day', 'partly', 0.3, 0.5), '#9E3F1E')?.opacity).toBe(
      0.5,
    );
    // Not at night, and not without sun.
    expect(has(layers('night', 'clear', 0, 1), '#9E3F1E')).toBeUndefined();
    expect(has(layers('afternoon', 'clear', 0, 0), '#9E3F1E')).toBeUndefined();
  });

  test('each kind of bad weather paints its own, darker sky', () => {
    expect(
      has(layers('afternoon', 'cloudy', 0.95, 0), '#4E4A5E')?.opacity,
    ).toBeCloseTo(0.6);
    expect(has(layers('afternoon', 'fog', 0.7, 0), '#69636F')?.opacity).toBe(
      0.75,
    );
    expect(
      has(layers('afternoon', 'drizzle', 0.9, 0), '#3E3E52')?.opacity,
    ).toBe(0.65);
    expect(has(layers('afternoon', 'rain', 1, 0), '#30303F')?.opacity).toBe(
      0.8,
    );
    expect(has(layers('afternoon', 'storm', 1, 0), '#1C1A28')?.opacity).toBe(
      0.92,
    );
    expect(has(layers('afternoon', 'snow', 1, 0), '#56627E')?.opacity).toBe(
      0.75,
    );
  });

  test('at night the same weather is darker still', () => {
    expect(has(layers('night', 'rain', 1, 0), '#141424')).toBeDefined();
    expect(has(layers('night', 'storm', 1, 0), '#0A0A16')).toBeDefined();
    expect(has(layers('dusk', 'cloudy', 1, 0), '#232233')).toBeDefined();
  });

  test('overcast greys the sky in step with the cloud cover', () => {
    const grey = (c: number) =>
      has(layers('day', 'cloudy', c, 0), '#4E4A5E')?.opacity ?? 0;
    expect(grey(0.5)).toBe(0);
    expect(grey(0.7)).toBeGreaterThan(0.2);
    expect(grey(1)).toBeCloseTo(0.6);
    expect(grey(0.7)).toBeLessThan(grey(1));
    // A clear or partly cloudy sky isn't greyed.
    expect(has(layers('day', 'partly', 0.4, 0.33), '#4E4A5E')).toBeUndefined();
  });

  test('no forecast: the usual sky, with no weather layers', () => {
    const l = layers('afternoon', null, null);
    for (const c of ['#9E3F1E', '#4E4A5E', '#30303F', '#1C1A28', '#69636F']) {
      expect(has(l, c)).toBeUndefined();
    }
  });
});
