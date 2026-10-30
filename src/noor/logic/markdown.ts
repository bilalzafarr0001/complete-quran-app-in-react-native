/**
 * The small Markdown subset the assistant writes: paragraphs, ### headings,
 * "- " bullets, "1." steps, **bold** and *italic*.
 */

export type Inline = { text: string; bold?: boolean; italic?: boolean };

export type MdBlock =
  | { kind: 'heading'; inline: Inline[]; rtl: boolean }
  | { kind: 'para'; inline: Inline[]; rtl: boolean }
  | { kind: 'bullet'; inline: Inline[]; depth: 0 | 1; rtl: boolean }
  | { kind: 'number'; n: string; inline: Inline[]; rtl: boolean };

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-z]/g;

/** Mostly Arabic script (Arabic or Urdu): laid out right to left. */
export function isRtl(s: string): boolean {
  const arabic = s.match(ARABIC)?.length ?? 0;
  const latin = s.match(LATIN)?.length ?? 0;
  return arabic > 0 && arabic >= latin;
}

/** Splits on a marker; an unmatched last marker stays as plain text. */
function splitPairs(s: string, marker: string): string[] {
  const parts = s.split(marker);
  if (parts.length % 2 === 0) {
    const last = parts.pop()!;
    parts[parts.length - 1] += marker + last;
  }
  return parts;
}

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  const clean = s.replace(/`([^`]+)`/g, '$1');
  splitPairs(clean, '**').forEach((part, i) => {
    const bold = i % 2 === 1;
    // A leftover (unmatched) "**" is text, not two italic markers.
    const kept = part.split('**').join('\u0000');
    splitPairs(kept, '*').forEach((raw, j) => {
      const piece = raw.split('\u0000').join('**');
      if (!piece) return;
      const italic = j % 2 === 1;
      const prev = out[out.length - 1];
      if (prev && !!prev.bold === bold && !!prev.italic === italic) {
        prev.text += piece;
      } else {
        out.push({
          text: piece,
          ...(bold ? { bold } : {}),
          ...(italic ? { italic } : {}),
        });
      }
    });
  });
  return out;
}

export function parseMarkdown(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (!para.length) return;
    const text = para.join('\n');
    blocks.push({ kind: 'para', inline: parseInline(text), rtl: isRtl(text) });
    para = [];
  };
  for (const raw of src.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m: RegExpExecArray | null;
    if (!line.trim()) {
      flush();
    } else if (/^\s*([-*_]\s*){3,}$/.test(line)) {
      flush(); // a horizontal rule: just a break
    } else if ((m = /^\s{0,3}#{1,6}\s+(.*?)\s*#*$/.exec(line))) {
      flush();
      blocks.push({
        kind: 'heading',
        inline: parseInline(m[1]),
        rtl: isRtl(m[1]),
      });
    } else if ((m = /^(\s*)[-*•]\s+(.*)$/.exec(line))) {
      flush();
      blocks.push({
        kind: 'bullet',
        depth: m[1].length >= 2 ? 1 : 0,
        inline: parseInline(m[2]),
        rtl: isRtl(m[2]),
      });
    } else if ((m = /^\s*(\d{1,3})[.)]\s+(.*)$/.exec(line))) {
      flush();
      blocks.push({
        kind: 'number',
        n: m[1],
        inline: parseInline(m[2]),
        rtl: isRtl(m[2]),
      });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}
