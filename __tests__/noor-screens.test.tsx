import React from 'react';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from '../src/noor/navigation/Shell';
import { StoreProvider } from '../src/noor/store';

jest.useFakeTimers();

async function pressByLabel(root: ReactTestInstance, label: string) {
  // Last match = the tab bar / the top-most pushed screen.
  const matches = root.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  );
  const node = matches[matches.length - 1];
  // Async act also flushes promise-based updates (storage, data loading).
  await ReactTestRenderer.act(async () => {
    node.props.onPress();
    jest.advanceTimersByTime(1000);
  });
}

function textContent(root: ReactTestInstance) {
  return root
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => n.children.filter(c => typeof c === 'string').join(''))
    .join(' | ');
}

describe('Noor screens render without crashing', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  beforeEach(async () => {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 390, height: 844 },
            insets: { top: 47, left: 0, right: 0, bottom: 34 },
          }}
        >
          <StoreProvider>
            <Shell />
          </StoreProvider>
        </SafeAreaProvider>,
      );
      jest.advanceTimersByTime(1000);
    });
    // Let saved state finish loading.
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });
  });

  afterEach(() => {
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('home shows the next prayer card', () => {
    expect(textContent(renderer.root)).toContain('NEXT PRAYER');
  });

  test.each(['Quran', 'Prayer', 'Tasbeeh', 'More', 'Home'])(
    'switches to the %s tab',
    async label => {
      await pressByLabel(renderer.root, label);
      expect(renderer.toJSON()).toBeTruthy();
    },
  );

  test('opens pushed screens from More', async () => {
    await pressByLabel(renderer.root, 'More');
    for (const [title, expected] of [
      ['99 Names', 'Ar-Rahman'],
      ['Duas', 'Daily Duas'],
      ['Qibla', 'to the Kaaba'],
      ['Settings', 'PRAYER TIMES'],
    ]) {
      const card = renderer.root.findAll(
        n =>
          typeof n.props.onPress === 'function' &&
          n.findAll(c => c.children.includes(title)).length > 0 &&
          n.props.accessibilityRole === 'button',
      )[0];
      await ReactTestRenderer.act(async () => {
        card.props.onPress();
        jest.advanceTimersByTime(1000);
      });
      expect(textContent(renderer.root)).toContain(expected);
      await pressByLabel(renderer.root, 'Go back');
    }
  });

  test('reads a surah, bookmarks and counts tasbeeh', async () => {
    await pressByLabel(renderer.root, 'Quran');
    const fatiha = renderer.root.findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.findAll(c => c.children.includes('Al-Fatihah')).length > 0,
    )[0];
    ReactTestRenderer.act(() => {
      fatiha.props.onPress();
      jest.advanceTimersByTime(1000);
    });
    // Offline in tests → loading skeleton, then the bundled sample.
    expect(textContent(renderer.root)).toContain('Loading the surah');
    for (let i = 0; i < 5; i++) {
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(500);
      });
    }
    expect(textContent(renderer.root)).toContain('Lord of the worlds');

    const bookmark = renderer.root.findAll(
      n => n.props.accessibilityLabel === 'Bookmark ayah' && n.props.onPress,
    )[0];
    ReactTestRenderer.act(() => {
      bookmark.props.onPress();
      jest.advanceTimersByTime(500);
    });
    expect(
      renderer.root.findAll(
        n => n.props.accessibilityLabel === 'Remove bookmark',
      ).length,
    ).toBeGreaterThan(0);

    await pressByLabel(renderer.root, 'Go back');
    await pressByLabel(renderer.root, 'Tasbeeh');
    const findCounter = () =>
      renderer.root.findAll(
        n =>
          typeof n.props.accessibilityLabel === 'string' &&
          n.props.accessibilityLabel.startsWith('Count ') &&
          n.props.onPress,
      )[0];
    for (let i = 0; i < 33; i++) {
      ReactTestRenderer.act(() => {
        findCounter().props.onPress();
      });
    }
    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(textContent(renderer.root)).toContain('Round 1 complete');
  });
});
