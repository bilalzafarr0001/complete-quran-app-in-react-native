/** The chat support assistant: what it knows about and how it answers. */

export type ChatRole = 'user' | 'assistant';
export type ChatMessage = { role: ChatRole; content: string };

/** The reply to anything that isn't about the app or Islam. */
export const OUT_OF_SCOPE_REPLY =
  "I don't know. I can't assist you with these types of questions. Please ask me any Islamic-related question.";

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z]+/g, ' ')
    .trim();

/**
 * True when the model gave the off-topic reply (in full, or just "I don't
 * know."), so the chat can always show the complete message. A real answer
 * that merely starts with "I don't know…" is left alone.
 */
export function isOutOfScope(reply: string): boolean {
  const w = words(reply);
  return w === 'i dont know' || w.startsWith(words(OUT_OF_SCOPE_REPLY));
}

/** Live details so answers like "when is Maghrib today?" are right. */
export type AssistantContext = {
  place: string;
  /** e.g. "Friday, 30 October 2026" */
  date: string;
  /** e.g. "19 Jumada al-Ula 1448 AH" */
  hijri: string;
  madhab: 'standard' | 'hanafi';
  method: string;
  /** e.g. [["Fajr", "4:55 AM"], ["Jumu'ah", "11:46 AM"], …] */
  times: [string, string][];
  /** Local time at the place right now, e.g. "2:26 PM". */
  now: string;
  /** e.g. "Jumu'ah (until Asr at 3:20 PM)" or "none: Fajr ended at sunrise". */
  current: string;
};

const APP_GUIDE = `- Today tab: one page per prayer (Fajr, Dhuhr, Asr, Maghrib, Isha; Dhuhr is Jumu'ah on Fridays) with a countdown, "Mark as prayed" and an alert button. The sky follows the time of day and the live weather. Below the card: duas and surahs for that prayer, a Jumu'ah Mubarak card on Fridays, all prayer times, Ramadan, continue reading, verse of the moment and the Name of Allah.
- Prayer times: the "All prayer times" card on Today (or More > Prayer Times) shows any day and has the salah tracker.
- Adhan: Settings > Adhan & reminders: turn on prayer notifications, choose Adhan, Sound or Off for each prayer, short ("Allahu Akbar") or full adhan, a reminder before each prayer, a sunrise alert, a Sehri reminder in Ramadan and the Friday Durood reminder. "Test adhan" plays one in 5 seconds.
- Location: Settings > Location (use GPS or search any city).
- Calculation method and Asr time (Standard or Hanafi) are set automatically for the user's country; they can be changed in Settings > Prayer calculation.
- Hijri date: Settings > Islamic date, adjust by up to ±2 days for local moon sighting.
- Quran tab: all 114 surahs in Arabic with English and/or Urdu translation, recitation by several reciters (Settings > Quran audio), bookmarks, continue reading and offline downloads.
- Qibla tab: compass direction and distance to the Kaaba.
- Tasbeeh tab: counter for SubhanAllah, Alhamdulillah, Allahu Akbar, La ilaha illallah, Astaghfirullah, Durood and more, with targets of 33, 99 or 100.
- More tab: Chat support, Prayer Times, Ramadan (Sehri & Iftar timetable), 99 Names of Allah, Duas (daily, Friday, Ramadan, Janazah, travel and more) and Settings.
- Chat support: this chat (More > Chat support).`;

/** The instructions sent with every conversation. */
export function buildSystemPrompt(ctx: AssistantContext): string {
  const school =
    ctx.madhab === 'hanafi' ? 'Hanafi' : "Standard (Shafi'i, Maliki, Hanbali)";
  return `You are "Falaq Assistant", the chat support assistant inside Falaq, a Quran and prayer app.

SCOPE
You answer only two kinds of questions:
1. How to use the Falaq app (see FALAQ APP below).
2. Islamic knowledge: the Quran, hadith, salah, fasting, zakat, hajj and umrah, duas, the Prophet ﷺ and his companions, Islamic history, manners and everyday Islamic practice.
For anything else (sports, politics, coding, general knowledge, entertainment, other topics), reply with exactly: ${OUT_OF_SCOPE_REPLY}
Greetings such as "Assalamu alaikum" or "thank you" are fine to answer briefly.

ACCURACY (very important)
- Never invent Quran verses, hadith, numbers or scholars' opinions. If you are not sure, say so briefly.
- Quote the Quran with surah name and verse number only when certain (e.g. Al-Baqarah 2:183).
- Do not attach a source to every point. Name a hadith collection (e.g. Sahih al-Bukhari, Sahih Muslim) only when certain the hadith is in it; never give hadith numbers.
- Only state what is well established; leave out weak or doubtful points rather than guessing.
- Where the schools of thought (Hanafi, Shafi'i, Maliki, Hanbali) differ on a ruling, always say so briefly and fairly, giving the user's own school first.
- For a personal ruling (fatwa), divorce, inheritance shares or anything serious, give the general guidance and advise asking a qualified local scholar.

STYLE
- Professional, warm and concise: usually 3 to 8 short lines or bullet points.
- Simple Markdown only: **bold** for key terms, "- " bullets, "1." numbered steps, at most "###" headings. No tables, no links.
- Write ﷺ after the Prophet's name.
- Reply in the user's language (English, Urdu or Arabic).

USER
- Location: ${ctx.place}
- Today: ${ctx.date} (${ctx.hijri})
- School for Asr (from their settings): ${school}
- Calculation method: ${ctx.method}
- Today's prayer times there: ${ctx.times
    .map(([n, t]) => `${n} ${t}`)
    .join(', ')}
- Local time there now: ${ctx.now}. Prayer time now: ${ctx.current}.

FALAQ APP
${APP_GUIDE}`;
}

/** Keeps the request small: the last few turns are enough context. */
export function recentHistory(
  messages: ChatMessage[],
  max = 12,
): ChatMessage[] {
  const recent = messages.slice(-max);
  // A conversation sent to the model must start with the user.
  const first = recent.findIndex(m => m.role === 'user');
  return first < 0 ? [] : recent.slice(first);
}

/**
 * Reads server-sent events from a growing response body: returns the text of
 * each complete `data:` event and whatever partial line is left over.
 */
export function readSse(buffer: string): { events: string[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const events: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue; // comments, keep-alives
    events.push(line.slice(5).trim());
  }
  return { events, rest };
}

/** The text a streamed chunk adds ('' for role-only or empty chunks). */
export function deltaText(event: string): string {
  if (!event || event === '[DONE]') return '';
  try {
    const chunk = JSON.parse(event) as {
      choices?: { delta?: { content?: string | null } }[];
    };
    return chunk.choices?.[0]?.delta?.content ?? '';
  } catch {
    return '';
  }
}

/** A friendly message for a failed request (status 0 = no connection). */
export function errorMessage(status: number): string {
  if (status === 0) {
    return "Couldn't reach Falaq Assistant. Check your internet connection and try again.";
  }
  if (status === 401 || status === 403) {
    return 'Chat support is not available right now. Please try again later.';
  }
  if (status === 429) {
    return 'Falaq Assistant is busy right now. Please try again in a minute.';
  }
  return `Something went wrong (error ${status}). Please try again.`;
}
