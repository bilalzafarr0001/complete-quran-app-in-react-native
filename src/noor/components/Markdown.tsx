import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Inline, MdBlock, parseMarkdown } from '../logic/markdown';

function Runs({ inline }: { inline: Inline[] }) {
  return (
    <>
      {inline.map((r, i) => (
        <Text
          key={i}
          style={[r.bold && styles.bold, r.italic && styles.italic]}
        >
          {r.text}
        </Text>
      ))}
    </>
  );
}

/** Renders the assistant's replies (paragraphs, headings, lists, bold). */
export const Markdown = memo(function MarkdownInner({
  text,
  color,
  accent,
  fontSize = 15,
}: {
  text: string;
  color: string;
  /** Bullets, step numbers and headings. */
  accent: string;
  fontSize?: number;
}) {
  const blocks = parseMarkdown(text);
  const lineHeight = Math.round(fontSize * 1.5);
  const base = { color, fontSize, lineHeight };
  const dir = (b: MdBlock) =>
    b.rtl
      ? ({ textAlign: 'right', writingDirection: 'rtl' } as const)
      : undefined;

  return (
    <View style={styles.wrap}>
      {blocks.map((b, i) => {
        if (b.kind === 'heading') {
          return (
            <Text
              key={i}
              style={[base, styles.heading, { color: accent }, dir(b)]}
            >
              <Runs inline={b.inline} />
            </Text>
          );
        }
        if (b.kind === 'para') {
          return (
            <Text key={i} style={[base, dir(b)]}>
              <Runs inline={b.inline} />
            </Text>
          );
        }
        const marker = b.kind === 'number' ? `${b.n}.` : '•';
        return (
          <View
            key={i}
            style={[
              styles.item,
              b.rtl && styles.itemRtl,
              b.kind === 'bullet' && b.depth === 1 && styles.nested,
            ]}
          >
            <Text
              style={[
                base,
                styles.marker,
                b.kind === 'number' && styles.number,
                { color: accent },
              ]}
            >
              {marker}
            </Text>
            <Text style={[base, styles.itemText, dir(b)]}>
              <Runs inline={b.inline} />
            </Text>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  heading: { fontWeight: '800', marginTop: 2 },
  item: { flexDirection: 'row', gap: 8 },
  itemRtl: { flexDirection: 'row-reverse' },
  nested: { marginLeft: 18 },
  marker: { fontWeight: '900', minWidth: 10 },
  number: { minWidth: 20 },
  itemText: { flex: 1 },
});
