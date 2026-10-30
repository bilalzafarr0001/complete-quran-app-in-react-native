import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from '../src/noor/navigation/Shell';
import * as verses from '../src/noor/services/verseOfMoment';
import { StoreProvider, useStore } from '../src/noor/store';

jest.useFakeTimers();

const STORAGE_KEY = 'noor:state:v1';
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

/**
 * A moment in Makkah (the default location) on Wednesday 28 October 2026:
 * Fajr ≈ 5:01, sunrise ≈ 6:22, Dhuhr ≈ 12:05, Asr ≈ 3:21 PM,
 * Maghrib ≈ 5:47 PM, Isha ≈ 7:17 PM.
 */
const makkah = (time: string, day = 28) =>
  new Date(`2026-10-${day}T${time}:00+03:00`);
const DURING_ASR = makkah('16:30');

/** Like the real app: the shell only appears once saved data has loaded. */
function WhenLoaded() {
  const { hydrated } = useStore();
  return hydrated ? <Shell /> : null;
}

let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

async function mount(at: Date = DURING_ASR, saved?: object) {
  jest.setSystemTime(at);
  if (saved) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <StoreProvider>
          <WhenLoaded />
        </StoreProvider>
      </SafeAreaProvider>,
    );
  });
  // Let saved state finish loading, then the first data refresh.
  await settle(1000);
  await settle(500);
}

const root = () => renderer!.root;

/** Runs timers and lets promise chains (storage, permissions) finish. */
async function settle(ms = 0) {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
}

/** Everything pressable with this label (a button can span several nodes). */
function pressables(r: ReactTestInstance, label: string) {
  return r.findAll(
    n =>
      n.props.accessibilityLabel === label &&
      typeof n.props.onPress === 'function',
  );
}

const has = (label: string) => pressables(root(), label).length > 0;

async function pressNode(node: ReactTestInstance) {
  // Async act also flushes promise-based updates (storage, data loading).
  await ReactTestRenderer.act(async () => {
    node.props.onPress();
    jest.advanceTimersByTime(1000);
  });
  await settle();
}

async function pressByLabel(r: ReactTestInstance, label: string) {
  // Last match = the tab bar / the top-most pushed screen.
  const matches = pressables(r, label);
  if (!matches.length) throw new Error(`Nothing labelled "${label}"`);
  await pressNode(matches[matches.length - 1]);
}

function textContent(r: ReactTestInstance) {
  return r
    .findAll(n => (n.type as unknown) === 'Text')
    .map(n => n.children.filter(c => typeof c === 'string').join(''))
    .join(' | ');
}

/** Tabs (role "tab") that are currently selected, by name. */
function selectedTabs(names: string[]) {
  return root()
    .findAll(
      n =>
        n.props.accessibilityRole === 'tab' &&
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityState?.selected === true,
    )
    .map(n => String(n.props.accessibilityLabel).split(',')[0])
    .filter(name => names.includes(name));
}
const selectedPrayer = () => selectedTabs(PRAYERS);
const DOCK = ['Today', 'Quran', 'Qibla', 'Tasbeeh', 'More'];
const selectedDock = () => selectedTabs(DOCK);

beforeEach(() => {
  (AsyncStorage as unknown as { __store: Map<string, string> }).__store.clear();
  (AppState.addEventListener as jest.Mock).mockClear();
});

afterEach(() => {
  if (renderer) ReactTestRenderer.act(() => renderer!.unmount());
  renderer = null;
});

describe('Today: five skies, one page per prayer', () => {
  test('opens on the prayer whose time it is, with the next one after it', async () => {
    await mount(DURING_ASR);
    const text = textContent(root());
    expect(selectedPrayer()).toEqual(['Asr']);
    expect(text).toContain('NOW · MAKKAH');
    expect(text).toMatch(/Started 3:\d\d PM/);
    expect(text).toContain('Maghrib in');
    expect(text).toContain('NEXT · MAKKAH');
    expect(text).toContain('EARLIER TODAY');
    expect(text).toContain('LATER TODAY');
    expect(text).toContain('Mark Asr as prayed');
    expect(text).not.toMatch(/Noor/);
    // Wednesday: no Friday greeting, and Dhuhr keeps its name.
    expect(text).toContain('Wednesday, 28 October 2026');
    expect(text).not.toContain("Jumu'ah");
    expect(has('Count Durood')).toBe(false);
  });

  test('marking the prayer as prayed ticks it off and stays on its page', async () => {
    await mount(DURING_ASR);
    expect(textContent(root())).toContain('0/5 prayed today');

    await pressByLabel(root(), 'Mark Asr as prayed');
    expect(has('Asr prayed. Tap to undo')).toBe(true);
    expect(has('Mark Asr as prayed')).toBe(false);
    expect(has('Asr, prayed')).toBe(true);
    expect(textContent(root())).toContain('1/5 prayed today');
    expect(selectedPrayer()).toEqual(['Asr']);

    await pressByLabel(root(), 'Asr prayed. Tap to undo');
    expect(has('Mark Asr as prayed')).toBe(true);
    expect(has('Asr, prayed')).toBe(false);
    expect(textContent(root())).toContain('0/5 prayed today');
  });

  test('once the current prayer is marked prayed, it opens on the next one', async () => {
    await mount(DURING_ASR, {
      onboarded: true,
      prayed: { '2026-10-28': ['fajr', 'dhuhr', 'asr'] },
    });
    expect(selectedPrayer()).toEqual(['Maghrib']);
    expect(textContent(root())).toContain('3/5 prayed today');
  });

  test('between sunrise and Dhuhr no prayer is due, so it opens on Dhuhr', async () => {
    await mount(makkah('10:00'));
    const text = textContent(root());
    expect(selectedPrayer()).toEqual(['Dhuhr']);
    expect(text).not.toContain('NOW · ');
    expect(text).toMatch(/Ended at sunrise · 6:\d\d AM/);
    expect(text).toContain('NEXT · MAKKAH');
    expect(text).toContain('Mark Fajr as prayed');
  });

  test("after Isha the next Fajr is tomorrow's", async () => {
    await mount(makkah('23:30'));
    const text = textContent(root());
    expect(selectedPrayer()).toEqual(['Isha']);
    expect(text).toContain('NEXT · TOMORROW');
    expect(text).toMatch(/Begins at [45]:\d\d AM tomorrow/);
    expect(text).toContain('Fajr in');
  });

  test("before Fajr, Isha still counts for last night's date", async () => {
    await mount(makkah('02:30', 29));
    expect(selectedPrayer()).toEqual(['Isha']);
    expect(textContent(root())).toContain('NOW · MAKKAH');

    await pressByLabel(root(), 'Mark Isha as prayed');
    await settle(1000); // saving is debounced
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    expect(saved.prayed).toEqual({ '2026-10-28': ['isha'] });
  });

  test('moves between prayers with the tabs and the page buttons', async () => {
    await mount(DURING_ASR);
    await pressByLabel(root(), 'Isha');
    expect(selectedPrayer()).toEqual(['Isha']);
    await pressByLabel(root(), 'Previous prayer: Maghrib');
    expect(selectedPrayer()).toEqual(['Maghrib']);
    await pressByLabel(root(), 'Next prayer: Isha');
    expect(selectedPrayer()).toEqual(['Isha']);
    await pressByLabel(root(), 'Fajr');
    expect(selectedPrayer()).toEqual(['Fajr']);
    // There is nothing before Fajr or after Isha.
    expect(has('Previous prayer: Isha')).toBe(false);
  });

  test('a prayer page turns on alerts and switches adhan / sound / off', async () => {
    await mount(DURING_ASR);
    expect(textContent(root())).toContain('Turn on prayer alerts');

    await pressByLabel(root(), 'Maghrib alert: Off. Tap to change');
    expect(has('Maghrib alert: Adhan. Tap to change')).toBe(true);
    expect(has('Maghrib alert: Off. Tap to change')).toBe(false);
    expect(textContent(root())).toMatch(/Adhan at 5:\d\d PM/);

    await pressByLabel(root(), 'Maghrib alert: Adhan. Tap to change');
    expect(textContent(root())).toMatch(/Sound at 5:\d\d PM/);

    await pressByLabel(root(), 'Maghrib alert: Sound. Tap to change');
    expect(textContent(root())).toContain('No alert');
    // Only Maghrib changed.
    expect(has('Isha alert: Adhan. Tap to change')).toBe(true);
  });

  test('each page links what belongs to that time of day', async () => {
    await mount(makkah('21:00'));
    const text = textContent(root());
    expect(text).toContain('WITH FAJR');
    expect(text).toContain('Morning dua');
    expect(text).toContain('Evening dua');
    expect(text).toContain('Surah Al-Mulk');
    expect(text).not.toContain('Dua at Iftar'); // only in Ramadan

    await pressByLabel(
      root(),
      'Duas before sleep. Before sleeping · upon waking',
    );
    let after = textContent(root());
    expect(after).toContain('Daily Duas');
    expect(after).toContain('Upon waking up'); // the Sleep duas…
    expect(after).not.toContain('Before eating'); // …and nothing else
    await pressByLabel(root(), 'Go back');

    await pressByLabel(
      root(),
      'Surah Al-Mulk. Read each night before sleeping',
    );
    // Surah 67 opens (offline in tests, so it asks to connect).
    expect(textContent(root())).toContain('The Sovereignty · Meccan · 30 ayat');
    await pressByLabel(root(), 'Go back');

    // Tasbeeh after salah is on every prayer's page.
    expect(textContent(root()).split('Tasbeeh after salah').length - 1).toBe(5);
    await pressByLabel(
      root(),
      'Tasbeeh after salah. SubhanAllah · Alhamdulillah · Allahu Akbar',
    );
    expect(selectedDock()).toEqual(['Tasbeeh']);
    after = textContent(root());
    expect(after).not.toContain('WITH ISHA');
  });

  test('the full timetable opens from Today, and its Qibla button goes to the Qibla tab', async () => {
    await mount(DURING_ASR);
    await pressByLabel(root(), 'All prayer times');
    expect(textContent(root())).toContain('Salah tracker');
    expect(has('Go back')).toBe(true);

    await pressByLabel(root(), 'Qibla direction');
    await settle(1000);
    const text = textContent(root());
    expect(selectedDock()).toEqual(['Qibla']);
    expect(text).toContain('to the Kaaba');
    expect(text).not.toContain('Salah tracker');
  });

  test('home shows a new verse of the moment each time the app is reopened', async () => {
    await mount();
    const text = () => textContent(root());
    expect(text()).toContain('Verse of the Moment');
    expect(text()).toContain('ENGLISH');
    expect(
      root().findAll(n => n.props.accessibilityLabel === 'New verse'),
    ).toHaveLength(0);

    jest.spyOn(verses, 'nextVerse').mockResolvedValue({
      surah: 94,
      ayah: 5,
      ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا',
      en: 'For indeed, with hardship [will be] ease.',
      ur: 'ہاں ہاں مشکل کے ساتھ آسانی بھی ہے',
    });
    const reopen = async () => {
      await ReactTestRenderer.act(async () => {
        const handlers = (AppState.addEventListener as jest.Mock).mock.calls
          .filter(([type]) => type === 'change')
          .map(([, handler]) => handler);
        handlers.forEach(h => h('background'));
        handlers.forEach(h => h('active'));
      });
      // Let the old verse slide out and the new one in.
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(1000);
      });
    };
    // The first reopen shows the verse fetched ahead; the second, the new one.
    await reopen();
    await reopen();
    expect(text()).toContain('For indeed, with hardship [will be] ease.');
    expect(text()).toContain('ہاں ہاں مشکل کے ساتھ آسانی بھی ہے');
  });

  test('home shows Ramadan and opens the Sehri & Iftar timetable', async () => {
    await mount();
    expect(textContent(root())).toMatch(/Ramadan 14\d\d/);
    await pressByLabel(root(), 'Ramadan timetable');
    const text = textContent(root());
    expect(text).toContain('SEHRI ENDS');
    expect(text).toContain('IFTAR');
    expect(text).toContain('Sehri reminder');
    expect(text).toContain('27th night begins at Iftar');
  });
});

describe("Fridays: Jumu'ah instead of Dhuhr", () => {
  /** Friday 30 October 2026 in Makkah (Dhuhr/Jumu'ah ≈ 12:04). */
  const FRIDAY_MORNING = makkah('11:00', 30);
  const savedState = async () =>
    JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);

  test("Today says Jumu'ah Mubarak and calls Dhuhr Jumu'ah", async () => {
    await mount(FRIDAY_MORNING);
    const text = textContent(root());
    expect(selectedTabs(["Jumu'ah"])).toEqual(["Jumu'ah"]);
    expect(text).toContain("Jumu'ah Mubarak · ");
    expect(text).toContain('30 October 2026');
    expect(text).not.toContain('Friday, 30 October');
    expect(text).toContain("WITH JUMU'AH");
    expect(text).not.toContain('Dhuhr');
    expect(has("Jumu'ah alert: Off. Tap to change")).toBe(true);
    expect(has("Next prayer: Jumu'ah")).toBe(true);
    expect(has("Previous prayer: Jumu'ah")).toBe(true);
  });

  test("the Jumu'ah page links Durood and Surah Al-Kahf", async () => {
    await mount(FRIDAY_MORNING);
    await pressByLabel(
      root(),
      'Durood on the Prophet ﷺ. Send it abundantly on Friday',
    );
    let text = textContent(root());
    expect(text).toContain('Durood Ibrahimi (Salawat)');
    expect(text).toContain('Short Durood (to repeat often)');
    expect(text).toContain('kama sallayta'); // opened, not just listed
    expect(text).not.toContain('Before eating');
    await pressByLabel(root(), 'Go back');

    await pressByLabel(
      root(),
      'Surah Al-Kahf. A light between the two Fridays',
    );
    text = textContent(root());
    expect(text).toContain('The Cave · Meccan · 110 ayat');
  });

  test('the Friday card counts Durood without losing a count in progress', async () => {
    await mount(FRIDAY_MORNING);
    expect(textContent(root())).toContain('Sunan Abi Dawud 1047');

    await pressByLabel(root(), 'Count Durood');
    expect(selectedDock()).toEqual(['Tasbeeh']);
    expect(textContent(root())).toContain("Allahumma salli 'ala Muhammad");
    const counter = () =>
      root().findAll(
        n =>
          typeof n.props.accessibilityLabel === 'string' &&
          n.props.accessibilityLabel.startsWith('Count ') &&
          n.props.accessibilityLabel !== 'Count Durood' &&
          n.props.onPress,
      )[0];
    for (let i = 0; i < 3; i++) {
      ReactTestRenderer.act(() => counter().props.onPress());
    }

    await pressByLabel(root(), 'Today');
    await pressByLabel(root(), 'Count Durood');
    await settle(1000);
    expect((await savedState()).tasbeeh).toMatchObject({
      dhikrId: 'durood',
      count: 3,
    });

    await pressByLabel(root(), 'Today');
    await pressByLabel(root(), 'Read Durood Ibrahimi');
    expect(textContent(root())).toContain('Short Durood (to repeat often)');
  });

  test("marking Jumu'ah as prayed fills Dhuhr's place in the tracker", async () => {
    await mount(makkah('12:30', 30));
    expect(textContent(root())).toContain('NOW · MAKKAH');
    expect(textContent(root())).toContain('Asr in');
    await pressByLabel(root(), "Mark Jumu'ah as prayed");
    expect(has("Jumu'ah, prayed")).toBe(true);
    expect(textContent(root())).toContain("✓  Jumu'ah prayed");
    await settle(1000);
    expect((await savedState()).prayed).toEqual({ '2026-10-30': ['dhuhr'] });
  });

  test("the timetable shows Jumu'ah on Fridays and Dhuhr on other days", async () => {
    await mount(FRIDAY_MORNING);
    await pressByLabel(root(), 'All prayer times');
    let text = textContent(root());
    expect(text).toContain("Jumu'ah in");
    expect(text).toContain('الجمعة');
    expect(text).not.toContain('Dhuhr');

    await pressByLabel(root(), 'Previous day');
    text = textContent(root());
    expect(text).toContain('Thursday, 29 October 2026');
    expect(text).toContain('Dhuhr');
    expect(has('Dhuhr alert: Off. Tap to change')).toBe(true);
  });

  test('the Friday Durood reminder is on by default and can be turned off', async () => {
    await mount(FRIDAY_MORNING, {
      onboarded: true,
      notifications: { enabled: true },
    });
    await pressByLabel(root(), 'Settings');
    const text = textContent(root());
    expect(text).toContain('Friday Durood reminder');
    expect(text).toContain(
      "Jumu'ah Mubarak at 10:00 AM, with a reminder to send Durood",
    );
    expect(text).toContain("الظهر · Jumu'ah on Fridays");
    const toggle = () =>
      root().findAll(
        n =>
          n.props.accessibilityLabel === 'Friday Durood reminder' &&
          typeof n.props.onValueChange === 'function',
      )[0];
    expect(toggle().props.value).toBe(true);
    await ReactTestRenderer.act(async () =>
      toggle().props.onValueChange(false),
    );
    await settle(1000);
    expect(toggle().props.value).toBe(false);
    expect((await savedState()).notifications.durood).toBe(false);
  });
});

describe('the floating dock and the other screens', () => {
  test.each(DOCK)('switches to %s', async label => {
    await mount();
    await pressByLabel(root(), label === 'Today' ? 'Quran' : 'Today');
    await pressByLabel(root(), label);
    expect(selectedDock()).toEqual([label]);
    expect(renderer!.toJSON()).toBeTruthy();
  });

  test('Qibla is a tab now, so it has no back button', async () => {
    await mount();
    await pressByLabel(root(), 'Qibla');
    expect(textContent(root())).toContain('to the Kaaba');
    expect(has('Go back')).toBe(false);
  });

  test('the app is branded Falaq everywhere (no old "Noor" name)', async () => {
    await mount();
    expect(textContent(root())).not.toMatch(/Noor/);
    await pressByLabel(root(), 'More');
    const text = textContent(root());
    expect(text).toContain('Falaq · Quran & Prayer');
    expect(text).toContain('Everything else in Falaq');
    expect(text).not.toMatch(/Noor/);
  });

  test('opens pushed screens from More', async () => {
    await mount();
    await pressByLabel(root(), 'More');
    for (const [title, expected] of [
      ['Prayer Times', 'Salah tracker'],
      ['99 Names', 'Ar-Rahman'],
      ['Duas', 'Daily Duas'],
      ['Settings', 'PRAYER TIMES'],
    ]) {
      const card = root().findAll(
        n =>
          typeof n.props.onPress === 'function' &&
          n.findAll(c => c.children.includes(title)).length > 0 &&
          n.props.accessibilityRole === 'button',
      )[0];
      await pressNode(card);
      expect(textContent(root())).toContain(expected);
      await pressByLabel(root(), 'Go back');
    }
  });

  test('duas can be filtered to Ramadan and Janazah', async () => {
    await mount();
    await pressByLabel(root(), 'More');
    const pressText = async (label: string) => {
      const node = root()
        .findAll(
          n =>
            typeof n.props.onPress === 'function' &&
            n.findAll(c => c.children.includes(label)).length > 0,
        )
        .pop()!;
      await pressNode(node);
    };
    await pressText('Duas');
    await pressText('Janazah');
    let text = textContent(root());
    expect(text).toContain('Janazah: after the 3rd takbir (adult)');
    expect(text).not.toContain('Before eating');
    await pressText('Ramadan');
    text = textContent(root());
    expect(text).toContain('At the time of Iftar');
    expect(text).not.toContain('Janazah: after the 3rd takbir (adult)');
  });

  test('reads a surah, bookmarks and counts tasbeeh', async () => {
    await mount();
    await pressByLabel(root(), 'Quran');
    const fatiha = root().findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.findAll(c => c.children.includes('Al-Fatihah')).length > 0,
    )[0];
    ReactTestRenderer.act(() => {
      fatiha.props.onPress();
      jest.advanceTimersByTime(1000);
    });
    // Offline in tests → loading skeleton, then the bundled sample.
    expect(textContent(root())).toContain('Loading the surah');
    for (let i = 0; i < 5; i++) {
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(500);
      });
    }
    expect(textContent(root())).toContain('Lord of the worlds');

    const bookmark = root().findAll(
      n => n.props.accessibilityLabel === 'Bookmark ayah' && n.props.onPress,
    )[0];
    ReactTestRenderer.act(() => {
      bookmark.props.onPress();
      jest.advanceTimersByTime(500);
    });
    expect(
      root().findAll(n => n.props.accessibilityLabel === 'Remove bookmark')
        .length,
    ).toBeGreaterThan(0);

    await pressByLabel(root(), 'Go back');
    await pressByLabel(root(), 'Tasbeeh');
    const findCounter = () =>
      root().findAll(
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
    expect(textContent(root())).toContain('Round 1 complete');
  });
});
