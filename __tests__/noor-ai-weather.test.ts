import {
  buildSystemPrompt,
  deltaText,
  errorMessage,
  isOutOfScope,
  OUT_OF_SCOPE_REPLY,
  readSse,
  recentHistory,
} from '../src/noor/logic/assistant';
import { isRtl, parseInline, parseMarkdown } from '../src/noor/logic/markdown';
import { forecastAt, skyWeather } from '../src/noor/logic/weather';
import { ChatError, streamChat } from '../src/noor/services/assistant';
import { fetchForecast } from '../src/noor/services/weather';
import type { Place } from '../src/noor/data/places';

describe('weather → sky', () => {
  test('WMO weather codes map to the sky that is painted', () => {
    expect([0, 1].map(skyWeather)).toEqual(['clear', 'clear']);
    expect(skyWeather(2)).toBe('partly');
    expect(skyWeather(3)).toBe('cloudy');
    expect([45, 48].map(skyWeather)).toEqual(['fog', 'fog']);
    expect([51, 55, 57].map(skyWeather)).toEqual([
      'drizzle',
      'drizzle',
      'drizzle',
    ]);
    expect([61, 65, 80, 82].map(skyWeather)).toEqual([
      'rain',
      'rain',
      'rain',
      'rain',
    ]);
    expect([71, 77, 85].map(skyWeather)).toEqual(['snow', 'snow', 'snow']);
    expect([95, 96, 99].map(skyWeather)).toEqual(['storm', 'storm', 'storm']);
  });

  const forecast = {
    time: [
      '2026-10-29T23:00',
      '2026-10-30T00:00',
      '2026-10-30T15:00',
      '2026-10-30T16:00',
    ],
    code: [3, 0, 61, null],
  };
  const day = { y: 2026, m: 10, d: 30 };

  test('a prayer gets the forecast for its nearest hour', () => {
    expect(forecastAt(forecast, day, 15.4)).toBe('rain'); // 3:24 PM → 15:00
    expect(forecastAt(forecast, day, 0.2)).toBe('clear');
    // Before midnight (Isha of the day before).
    expect(forecastAt(forecast, day, -0.8)).toBe('cloudy');
    // No data, or not in the forecast.
    expect(forecastAt(forecast, day, 15.6)).toBeNull();
    expect(forecastAt(forecast, day, 9)).toBeNull();
  });

  test('fetches only weather conditions (no temperature) in local time', async () => {
    const lahore: Place = {
      name: 'Lahore',
      country: 'Pakistan',
      countryCode: 'PK',
      lat: 31.52,
      lng: 74.36,
      timeZone: 'Asia/Karachi',
      utcOffset: 5,
      source: 'search',
    };
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({
        hourly: { time: ['2026-10-30T15:00'], weather_code: [0] },
      }),
    }));
    const f = await fetchForecast(lahore);
    const url = String(fetchMock.mock.calls.at(-1)[0]);
    expect(url).toContain('latitude=31.52&longitude=74.36');
    expect(url).toContain('hourly=weather_code&');
    expect(url).toContain('timezone=Asia%2FKarachi');
    expect(url).not.toContain('temperature');
    expect(f).toEqual({ time: ['2026-10-30T15:00'], code: [0] });

    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ hourly: {} }),
    }));
    await expect(fetchForecast(lahore)).rejects.toThrow('No forecast');
  });
});

describe('chat support: what the assistant is told', () => {
  const prompt = buildSystemPrompt({
    place: 'Lahore, Pakistan',
    date: 'Friday, 30 October 2026',
    hijri: '19 Jumada al-Ula 1448 AH',
    madhab: 'hanafi',
    method: 'Univ. of Islamic Sciences, Karachi',
    times: [
      ['Fajr', '4:55 AM'],
      ["Jumu'ah", '11:46 AM'],
    ],
    now: '2:26 PM',
    current: "Jumu'ah (until Asr at 3:38 PM)",
  });

  test('only the app and Islam; anything else gets "I don\'t know."', () => {
    expect(OUT_OF_SCOPE_REPLY).toBe(
      "I don't know. I can't assist you with these types of questions. Please ask me any Islamic-related question.",
    );
    expect(prompt).toContain(`reply with exactly: ${OUT_OF_SCOPE_REPLY}`);
    expect(prompt).toContain('How to use the Falaq app');
    expect(prompt).toContain('Islamic knowledge');
  });

  test('recognises the off-topic reply, short or in full, but not real answers', () => {
    expect(isOutOfScope(OUT_OF_SCOPE_REPLY)).toBe(true);
    expect(isOutOfScope("I don't know.")).toBe(true);
    expect(isOutOfScope('I dont know')).toBe(true);
    expect(
      isOutOfScope(
        'I don’t know. I can’t assist you with these types of questions. Please ask me any Islamic-related question.',
      ),
    ).toBe(true);
    expect(
      isOutOfScope(
        "I don't know the exact wording, but the hadith is in Sahih Muslim.",
      ),
    ).toBe(false);
    expect(isOutOfScope('Ghusl is a Sunnah of Friday.')).toBe(false);
  });

  test('guards against made-up sources and respects the schools of thought', () => {
    expect(prompt).toContain('Never invent Quran verses, hadith');
    expect(prompt).toContain('never give hadith numbers');
    expect(prompt).toContain("giving the user's own school first");
    expect(prompt).toContain('qualified local scholar');
  });

  test("knows the user's place, date, school and today's times", () => {
    expect(prompt).toContain('Location: Lahore, Pakistan');
    expect(prompt).toContain(
      'Friday, 30 October 2026 (19 Jumada al-Ula 1448 AH)',
    );
    expect(prompt).toContain('School for Asr (from their settings): Hanafi');
    expect(prompt).toContain("Fajr 4:55 AM, Jumu'ah 11:46 AM");
    expect(prompt).toContain(
      "Local time there now: 2:26 PM. Prayer time now: Jumu'ah (until Asr at 3:38 PM).",
    );
    expect(prompt).toContain('Settings > Adhan & reminders');
  });

  test('sends only recent turns, starting with a question', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(i),
    }));
    const recent = recentHistory(many, 5);
    expect(recent[0].role).toBe('user');
    expect(recent.map(m => m.content)).toEqual(['16', '17', '18', '19']);
    expect(recentHistory([{ role: 'assistant', content: 'hi' }])).toEqual([]);
  });

  test('friendly errors', () => {
    expect(errorMessage(0)).toMatch(/internet connection/);
    expect(errorMessage(429)).toMatch(/busy/);
    expect(errorMessage(403)).toMatch(/not available/);
    expect(errorMessage(500)).toBe(
      'Something went wrong (error 500). Please try again.',
    );
  });
});

describe('chat support: streaming replies', () => {
  test('reads server-sent events, keeping a partial line for later', () => {
    const { events, rest } = readSse(
      ': keep-alive\ndata: {"a":1}\n\ndata: [DONE]\ndata: {"b"',
    );
    expect(events).toEqual(['{"a":1}', '[DONE]']);
    expect(rest).toBe('data: {"b"');
    expect(deltaText('{"choices":[{"delta":{"content":"Salam"}}]}')).toBe(
      'Salam',
    );
    expect(deltaText('{"choices":[{"delta":{"role":"assistant"}}]}')).toBe('');
    expect(deltaText('[DONE]')).toBe('');
    expect(deltaText('not json')).toBe('');
  });

  /** A stand-in for XMLHttpRequest that the test feeds by hand. */
  class FakeXHR {
    static last: FakeXHR;
    status = 0;
    responseText = '';
    timeout = 0;
    url = '';
    headers: Record<string, string> = {};
    body: any = null;
    onprogress?: () => void;
    onload?: () => void;
    onerror?: () => void;
    ontimeout?: () => void;
    onabort?: () => void;
    open(_method: string, url: string) {
      this.url = url;
    }
    setRequestHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    send(body: string) {
      this.body = JSON.parse(body);
      FakeXHR.last = this;
    }
    abort() {
      this.onabort?.();
    }
    push(chunk: string) {
      this.status = 200;
      this.responseText += chunk;
      this.onprogress?.();
    }
    finish(status = 200) {
      this.status = status;
      this.onload?.();
    }
  }
  const sse = (t: string) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`;
  const original = globalThis.XMLHttpRequest;
  beforeAll(() => {
    (globalThis as any).XMLHttpRequest = FakeXHR;
  });
  afterAll(() => {
    (globalThis as any).XMLHttpRequest = original;
  });

  const start = () => {
    const seen: string[] = [];
    const h = streamChat({
      system: 'SYSTEM',
      messages: [{ role: 'user', content: 'What breaks the fast?' }],
      onText: t => seen.push(t),
    });
    return { h, seen, xhr: FakeXHR.last };
  };

  test('asks xKiro for a streamed answer with the system prompt first', () => {
    const { xhr } = start();
    expect(xhr.url).toBe('https://api.xkiro.com/v1/chat/completions');
    expect(xhr.headers.Authorization).toBe('Bearer sk-xt-your-key-here');
    expect(xhr.body.model).toBe('qwen/qwen3.8-max:free');
    expect(xhr.body.stream).toBe(true);
    expect(xhr.body.messages[0]).toEqual({ role: 'system', content: 'SYSTEM' });
    expect(xhr.body.messages[1].content).toBe('What breaks the fast?');
  });

  test('shows the reply as it arrives, even when a chunk is cut mid-line', async () => {
    const { h, seen, xhr } = start();
    xhr.push(': keep-alive\n\n');
    const second = sse(' breaks');
    xhr.push(sse('**Eating**') + second.slice(0, 12));
    xhr.push(second.slice(12) + 'data: [DONE]\n\n');
    xhr.finish();
    await expect(h.done).resolves.toBe('**Eating** breaks');
    expect(seen).toEqual(['**Eating**', '**Eating** breaks']);
  });

  test('errors become friendly messages', async () => {
    let { h, xhr } = start();
    xhr.finish(429);
    await expect(h.done).rejects.toEqual(new ChatError(errorMessage(429), 429));
    ({ h, xhr } = start());
    xhr.onerror?.();
    await expect(h.done).rejects.toMatchObject({ status: 0 });
    ({ h, xhr } = start());
    xhr.ontimeout?.();
    await expect(h.done).rejects.toMatchObject({ status: 408 });
    ({ h, xhr } = start());
    xhr.push(': keep-alive\n\n');
    xhr.finish();
    await expect(h.done).rejects.toMatchObject({ status: 502 });
  });

  test('Stop keeps what was written so far', async () => {
    const { h, xhr } = start();
    xhr.push(sse('Ghusl, perfume'));
    h.cancel();
    await expect(h.done).resolves.toBe('Ghusl, perfume');
  });

  test('a plain (non-streamed) JSON reply also works', async () => {
    const { h, xhr } = start();
    xhr.push(JSON.stringify({ choices: [{ message: { content: 'Salam' } }] }));
    xhr.finish();
    await expect(h.done).resolves.toBe('Salam');
  });
});

describe('chat support: formatted answers', () => {
  test('bold, italic and stray markers', () => {
    expect(parseInline('**Ghusl** before *Jumu’ah*')).toEqual([
      { text: 'Ghusl', bold: true },
      { text: ' before ' },
      { text: 'Jumu’ah', italic: true },
    ]);
    expect(parseInline('5 * 3 = 15')).toEqual([{ text: '5 * 3 = 15' }]);
    expect(parseInline('a **b')).toEqual([{ text: 'a **b' }]);
  });

  test('headings, bullets, numbered steps and paragraphs', () => {
    const blocks = parseMarkdown(
      '### Sunnahs of Friday\n- **Ghusl**\n  - nested\n* Perfume\n\n1. Open Settings\n2) Tap Adhan\n---\nMay Allah accept.',
    );
    expect(blocks.map(b => b.kind)).toEqual([
      'heading',
      'bullet',
      'bullet',
      'bullet',
      'number',
      'number',
      'para',
    ]);
    expect(blocks[2]).toMatchObject({ kind: 'bullet', depth: 1 });
    expect(blocks[5]).toMatchObject({ kind: 'number', n: '2' });
    expect(blocks[6]).toMatchObject({
      inline: [{ text: 'May Allah accept.' }],
    });
  });

  test('Urdu and Arabic lines are laid out right to left', () => {
    expect(isRtl('روزہ کن چیزوں سے ٹوٹ جاتا ہے؟')).toBe(true);
    expect(isRtl('Fasting: الصوم')).toBe(false);
    const [b] = parseMarkdown('- **کھانا یا پینا**: جان بوجھ کر');
    expect(b).toMatchObject({ kind: 'bullet', rtl: true });
  });
});
