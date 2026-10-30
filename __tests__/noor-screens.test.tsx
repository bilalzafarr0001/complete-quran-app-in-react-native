import React from 'react';
import { AppState } from 'react-native';
import ReactTestRenderer, { ReactTestInstance } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from '../src/noor/navigation/Shell';
import * as assistant from '../src/noor/services/assistant';
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

  test('moves between prayers with the tabs; the links below follow', async () => {
    await mount(DURING_ASR);
    expect(textContent(root())).toContain('With Asr');
    await pressByLabel(root(), 'Isha');
    expect(selectedPrayer()).toEqual(['Isha']);
    expect(textContent(root())).toContain('With Isha');
    await pressByLabel(root(), 'Maghrib');
    expect(selectedPrayer()).toEqual(['Maghrib']);
    await pressByLabel(root(), 'Fajr');
    expect(selectedPrayer()).toEqual(['Fajr']);
    const text = textContent(root());
    expect(text).toContain('With Fajr');
    expect(text).not.toContain('With Asr');
  });

  test('the prayer card has only its essentials (the links sit below it)', async () => {
    await mount(DURING_ASR);
    // No page buttons inside the card any more; the tabs do that.
    expect(has('Previous prayer: Dhuhr')).toBe(false);
    expect(has('Next prayer: Maghrib')).toBe(false);
    // Only the prayer on screen lists its links.
    expect(textContent(root()).split('Tasbeeh after salah').length - 1).toBe(1);
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
    let text = textContent(root());
    expect(text).toContain('With Isha');
    expect(text).toContain('Surah Al-Mulk');
    await pressByLabel(root(), 'Fajr');
    expect(textContent(root())).toContain('Morning dua');
    await pressByLabel(root(), 'Asr');
    expect(textContent(root())).toContain('Evening dua');
    await pressByLabel(root(), 'Maghrib');
    expect(textContent(root())).not.toContain('Dua at Iftar'); // only in Ramadan
    await pressByLabel(root(), 'Isha');
    text = textContent(root());
    expect(text).toContain('Duas before sleep');

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

    // Tasbeeh after salah belongs to every prayer.
    expect(textContent(root())).toContain('Tasbeeh after salah');
    await pressByLabel(
      root(),
      'Tasbeeh after salah. SubhanAllah · Alhamdulillah · Allahu Akbar',
    );
    expect(selectedDock()).toEqual(['Tasbeeh']);
    after = textContent(root());
    expect(after).not.toContain('With Isha');
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
    expect(text).toContain("With Jumu'ah");
    expect(text).not.toContain('Dhuhr');
    expect(has("Jumu'ah alert: Off. Tap to change")).toBe(true);
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
    expect(text).toContain("Jumu'ah on Fridays");
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

describe('the sky follows the live weather', () => {
  const fetchMock = globalThis.fetch as jest.Mock;
  afterEach(() => {
    fetchMock.mockImplementation(() =>
      Promise.reject(new Error('offline (test)')),
    );
  });

  /** The weather each prayer page's sky is painted with, by phase. */
  const skies = () => {
    const out: Record<string, unknown> = {};
    for (const n of root().findAll(
      x => typeof x.props.phase === 'string' && 'weather' in x.props,
    )) {
      out[n.props.phase] = n.props.weather;
    }
    return out;
  };

  test('each prayer gets the forecast for its time; no temperature is shown', async () => {
    // Makkah, Wednesday 28 October (hourly, local time).
    const time: string[] = [];
    const code: number[] = [];
    for (let h = 0; h < 24; h++) {
      time.push(`2026-10-28T${h < 10 ? '0' : ''}${h}:00`);
      // Fajr ~5:01 clear, Dhuhr ~12:05 partly cloudy, now (16:30 → 17:00)
      // rain, Maghrib ~5:47 PM (18:00) overcast, Isha ~7:17 PM storm.
      code.push(
        h === 12 ? 2 : h === 17 ? 63 : h === 18 ? 3 : h === 19 ? 95 : 0,
      );
    }
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('api.open-meteo.com/v1/forecast')
        ? {
            ok: true,
            json: async () => ({ hourly: { time, weather_code: code } }),
          }
        : Promise.reject(new Error('offline (test)')),
    );
    await mount(DURING_ASR);
    await settle(500);
    await settle(500);
    expect(skies()).toEqual({
      dawn: 'clear',
      day: 'partly',
      afternoon: 'rain',
      dusk: 'cloudy',
      night: 'storm',
    });
    const text = textContent(root());
    expect(text).not.toMatch(/°|Rain|Cloudy|Thunderstorm/);
    expect(
      fetchMock.mock.calls.some(([u]) => String(u).includes('weather_code')),
    ).toBe(true);
  });

  test('offline (no forecast yet), the sky looks as usual', async () => {
    await mount(DURING_ASR);
    expect(Object.values(skies())).toEqual([null, null, null, null, null]);
  });
});

describe('chat support (AI)', () => {
  const STORE = 'noor:chat:v1';
  const openChat = async () => {
    await mount(DURING_ASR, { onboarded: true });
    await pressByLabel(root(), 'More');
    await pressByLabel(root(), 'Chat support');
  };
  const reply = (text: string) =>
    jest.spyOn(assistant, 'streamChat').mockImplementation(({ onText }) => {
      onText(text.slice(0, 5));
      return { done: Promise.resolve(text), cancel: jest.fn() };
    });
  afterEach(() => jest.restoreAllMocks());

  test('More has a Chat support button that opens the assistant', async () => {
    await openChat();
    const text = textContent(root());
    expect(text).toContain('Falaq Assistant');
    expect(text).toContain('Assalamu alaikum');
    expect(text).toContain('TRY ASKING');
    expect(text).toContain('AI answers can be wrong');
    expect(has('Send')).toBe(true);
  });

  test('Chat support is shown once: on More, not in Settings', async () => {
    await mount(DURING_ASR, { onboarded: true });
    await pressByLabel(root(), 'Settings');
    expect(textContent(root())).toContain('PRAYER CALCULATION');
    expect(has('Chat support')).toBe(false);
  });

  test('a question gets a formatted answer, with the user’s context', async () => {
    const spy = reply('**Ghusl** before Jumu’ah\n- Wear clean clothes');
    await openChat();
    await pressByLabel(root(), 'Ask: What are the Sunnahs of Friday?');
    await settle();
    const [{ system, messages }] = spy.mock.calls[0];
    expect(messages).toEqual([
      { role: 'user', content: 'What are the Sunnahs of Friday?' },
    ]);
    expect(system).toContain('Location: Makkah, Saudi Arabia');
    expect(system).toContain('Wednesday, 28 October 2026');
    // DURING_ASR is 4:30 PM in Makkah.
    expect(system).toMatch(
      /Local time there now: 4:30 PM\. Prayer time now: Asr \(until Maghrib at 5:\d\d PM\)/,
    );
    const text = textContent(root());
    expect(text).toContain('What are the Sunnahs of Friday?');
    expect(text).toContain('Ghusl'); // bold, without the ** markers
    expect(text).not.toContain('**');
    expect(text).toContain('Wear clean clothes');
    expect(text).not.toContain('TRY ASKING');
    await settle(1000);
    const saved = JSON.parse((await AsyncStorage.getItem(STORE))!);
    expect(saved).toHaveLength(2);
    expect(saved[1].role).toBe('assistant');
  });

  test('typed questions are sent too; off-topic ones get "I don\'t know."', async () => {
    const spy = reply("I don't know.");
    await openChat();
    const input = root().findAll(
      n => n.props.accessibilityLabel === 'Message' && n.props.onChangeText,
    )[0];
    await ReactTestRenderer.act(async () => {
      input.props.onChangeText('Who won the 2022 World Cup?');
    });
    await pressByLabel(root(), 'Send');
    await settle();
    expect(spy).toHaveBeenCalledTimes(1);
    // Even a bare "I don't know." shows the full, friendly message.
    expect(textContent(root())).toContain(
      "I don't know. I can't assist you with these types of questions. Please ask me any Islamic-related question.",
    );
  });

  test('errors can be retried without repeating the question', async () => {
    const spy = jest
      .spyOn(assistant, 'streamChat')
      .mockImplementationOnce(() => ({
        done: Promise.reject(
          new assistant.ChatError(
            "Couldn't reach Falaq Assistant. Check your internet connection and try again.",
            0,
          ),
        ),
        cancel: jest.fn(),
      }))
      .mockImplementationOnce(({ onText }) => {
        onText('Wa alaikum');
        return {
          done: Promise.resolve('Wa alaikum assalam!'),
          cancel: jest.fn(),
        };
      });
    await openChat();
    await pressByLabel(root(), 'Ask: What breaks the fast?');
    await settle();
    expect(textContent(root())).toContain('Check your internet connection');
    await pressByLabel(root(), 'Try again');
    await settle();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1][0].messages).toEqual([
      { role: 'user', content: 'What breaks the fast?' },
    ]);
    const text = textContent(root());
    expect(text).toContain('Wa alaikum assalam!');
    expect(text).not.toContain('Check your internet connection');
    expect(text.split('What breaks the fast?').length - 1).toBe(1);
  });

  test('New chat clears the conversation', async () => {
    reply('Salam');
    await openChat();
    await pressByLabel(root(), 'Ask: How do I pray Witr?');
    await settle();
    expect(textContent(root())).toContain('Salam');
    await pressByLabel(root(), 'New chat');
    const text = textContent(root());
    expect(text).not.toContain('Salam');
    expect(text).toContain('TRY ASKING');
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
      ['Settings', 'PRAYER CALCULATION'],
      ['Chat support', 'Falaq Assistant'],
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
