import { XKIRO_API_KEY, XKIRO_BASE_URL, XKIRO_MODEL } from '@env';
import {
  ChatMessage,
  deltaText,
  errorMessage,
  readSse,
} from '../logic/assistant';
import { readJson, writeJson } from './storage';

/** xKiro: an OpenAI-compatible AI gateway (key and model come from .env). */
const BASE_URL = (XKIRO_BASE_URL || 'https://api.xkiro.com/v1').replace(
  /\/+$/,
  '',
);
const MODEL = XKIRO_MODEL || 'qwen/qwen3.8-max:free';
/** Free models can take a while to start answering. */
const TIMEOUT_MS = 120000;
const HISTORY_KEY = 'noor:chat:v1';

export class ChatError extends Error {
  /** HTTP status (0 = no connection, 408 = timeout, -1 = not set up). */
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type ChatHandle = {
  /** The full reply (or what arrived before Stop was pressed). */
  done: Promise<string>;
  cancel: () => void;
};

/**
 * Sends the conversation and streams the reply as it's written (`onText`
 * gets the text so far). Uses XMLHttpRequest because React Native's fetch
 * can't read a response while it's still arriving.
 */
export function streamChat({
  system,
  messages,
  onText,
}: {
  system: string;
  messages: ChatMessage[];
  onText: (soFar: string) => void;
}): ChatHandle {
  const xhr = new XMLHttpRequest();
  let seen = 0;
  let rest = '';
  let text = '';

  const consume = () => {
    const body = xhr.responseText ?? '';
    if (body.length <= seen) return;
    const read = readSse(rest + body.slice(seen));
    seen = body.length;
    rest = read.rest;
    const added = read.events.map(deltaText).join('');
    if (added) {
      text += added;
      onText(text);
    }
  };

  const done = new Promise<string>((resolve, reject) => {
    if (!XKIRO_API_KEY) {
      reject(new ChatError('Chat support is not set up in this version.', -1));
      return;
    }
    xhr.open('POST', `${BASE_URL}/chat/completions`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Authorization', `Bearer ${XKIRO_API_KEY}`);
    xhr.timeout = TIMEOUT_MS;
    // Set before send: React Native only streams progress if it's there.
    xhr.onprogress = () => {
      if (xhr.status === 200) consume();
    };
    xhr.onload = () => {
      if (xhr.status !== 200) {
        reject(new ChatError(errorMessage(xhr.status), xhr.status));
        return;
      }
      consume();
      if (rest) {
        text += readSse(`${rest}\n`).events.map(deltaText).join('');
        rest = '';
      }
      if (!text.trim()) {
        // Not streamed after all: a plain JSON reply.
        try {
          const json = JSON.parse(xhr.responseText) as {
            choices?: { message?: { content?: string } }[];
          };
          text = json.choices?.[0]?.message?.content ?? '';
        } catch {
          // fall through
        }
      }
      if (text.trim()) resolve(text.trim());
      else {
        reject(
          new ChatError(
            "Falaq Assistant didn't send an answer. Please try again.",
            502,
          ),
        );
      }
    };
    xhr.onerror = () => reject(new ChatError(errorMessage(0), 0));
    xhr.ontimeout = () =>
      reject(
        new ChatError(
          'Falaq Assistant took too long to answer. Please try again.',
          408,
        ),
      );
    // Stopped by the user: keep what was written so far.
    xhr.onabort = () => resolve(text.trim());
    xhr.send(
      JSON.stringify({
        model: MODEL,
        stream: true,
        temperature: 0.3,
        max_tokens: 900,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    );
  });

  return { done, cancel: () => xhr.abort() };
}

/** The saved conversation (kept on the phone only). */
export async function loadChat(): Promise<ChatMessage[]> {
  return (await readJson<ChatMessage[]>(HISTORY_KEY)) ?? [];
}

export function saveChat(messages: ChatMessage[]) {
  return writeJson(HISTORY_KEY, messages.slice(-40));
}
