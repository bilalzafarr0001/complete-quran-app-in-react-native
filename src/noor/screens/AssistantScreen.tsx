import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpinningStar } from '../components/Decor';
import { FadeIn } from '../components/FadeIn';
import { Markdown } from '../components/Markdown';
import { PressableScale } from '../components/PressableScale';
import { headerStyles } from '../components/ScreenHeader';
import { usePrayerData } from '../hooks/usePrayerData';
import { contentColumn } from '../hooks/useResponsive';
import {
  buildSystemPrompt,
  ChatMessage,
  OUT_OF_SCOPE_REPLY,
  recentHistory,
} from '../logic/assistant';
import { formatGregorian } from '../logic/dates';
import { prayerLabel } from '../logic/friday';
import { formatHijri } from '../logic/hijri';
import { formatTime, METHODS, PRAYER_KEYS } from '../logic/prayerTimes';
import { useNav } from '../navigation/nav';
import {
  ChatError,
  ChatHandle,
  loadChat,
  saveChat,
  streamChat,
} from '../services/assistant';
import { useStore } from '../store';
import { onHero, useTheme } from '../theme';

const SUGGESTIONS = [
  'How do I turn on the adhan?',
  'What are the Sunnahs of Friday?',
  'What breaks the fast?',
  'How do I pray Witr?',
];

/** Three dots that pulse while the assistant is thinking. */
function TypingDots({ color }: { color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={styles.dots} accessibilityLabel="Falaq Assistant is typing">
      {[0, 1, 2].map(i => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: t.interpolate({
                inputRange: [0, 0.2 + i * 0.2, 0.4 + i * 0.2, 1],
                outputRange: [0.3, 1, 0.3, 0.3],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

function Avatar() {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>✦</Text>
    </View>
  );
}

/**
 * Chat support: an AI assistant (via xKiro) for questions about the app and
 * about Islam. Replies stream in as they're written; the conversation is
 * kept on the phone.
 */
export function AssistantScreen() {
  const theme = useTheme();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const { state } = useStore();
  const { place, date, hijri, today, now, status } = usePrayerData(30000);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  /** The reply being written right now ('' = still thinking). */
  const [live, setLive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(0);
  const handle = useRef<ChatHandle | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    let alive = true;
    loadChat().then(saved => {
      if (!alive) return;
      setMessages(saved);
      setLoaded(true);
    });
    return () => {
      alive = false;
      const h = handle.current;
      handle.current = null; // its reply is no longer wanted
      h?.cancel();
    };
  }, []);

  useEffect(() => {
    if (loaded) saveChat(messages);
  }, [messages, loaded]);

  // Lift the input above the keyboard (the window doesn't resize when the
  // app draws edge to edge).
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboard(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboard(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const system = useMemo(
    () =>
      buildSystemPrompt({
        place: [place.name, place.country].filter(Boolean).join(', '),
        date: formatGregorian(date),
        hijri: formatHijri(hijri),
        madhab: state.madhab,
        method: METHODS[state.method].name,
        times: PRAYER_KEYS.map(k => [
          prayerLabel(k, date).en,
          formatTime(today[k]),
        ]),
        now: formatTime(now.hours),
        current:
          status.current === 'sunrise'
            ? `none: Fajr ended at sunrise; next is ${
                prayerLabel(status.next, date).en
              } at ${formatTime(status.nextTime)}`
            : `${prayerLabel(status.current, date).en} (until ${
                prayerLabel(status.next, date).en
              } at ${formatTime(status.nextTime)})`,
      }),
    [place, date, hijri, state.madhab, state.method, today, now.hours, status],
  );

  const ask = useCallback(
    (history: ChatMessage[]) => {
      setError(null);
      setLive('');
      const h = streamChat({
        system,
        messages: recentHistory(history),
        onText: setLive,
      });
      handle.current = h;
      // Replies to a conversation that was cleared (New chat) are dropped.
      const current = () => handle.current === h;
      h.done
        .then(reply => {
          if (current() && reply) {
            setMessages(m => [...m, { role: 'assistant', content: reply }]);
          }
        })
        .catch((e: unknown) => {
          if (current()) {
            setError(
              e instanceof ChatError ? e.message : 'Something went wrong.',
            );
          }
        })
        .finally(() => {
          if (current()) {
            handle.current = null;
            setLive(null);
          }
        });
    },
    [system],
  );

  const send = (text: string) => {
    const q = text.trim();
    if (!q || live !== null) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setDraft('');
    ask(next);
  };

  const retry = () => {
    if (live !== null || !messages.length) return;
    ask(messages);
  };

  const newChat = () => {
    const h = handle.current;
    handle.current = null;
    h?.cancel();
    setLive(null);
    setError(null);
    setMessages([]);
  };

  const busy = live !== null;
  const empty = loaded && !messages.length && !busy;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundImage: theme.hero, paddingTop: insets.top + 10 },
        ]}
      >
        <SpinningStar
          size={150}
          color="rgba(255,197,138,0.16)"
          style={styles.headerStar}
        />
        <View style={[contentColumn, styles.headerRow]}>
          <PressableScale
            onPress={nav.pop}
            style={headerStyles.iconButton}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Text style={styles.backIcon}>‹</Text>
          </PressableScale>
          <Avatar />
          <View style={styles.flex}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Falaq Assistant
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              {busy ? 'Typing…' : 'Chat support · the app & Islam'}
            </Text>
          </View>
          {messages.length || busy ? (
            <PressableScale
              onPress={newChat}
              style={styles.newChat}
              accessibilityLabel="New chat"
            >
              <Text style={styles.newChatText}>New chat</Text>
            </PressableScale>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={[contentColumn, styles.list]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd()}
      >
        {empty ? (
          <FadeIn distance={10}>
            <View
              style={[
                styles.welcome,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
            >
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>
                Assalamu alaikum 👋
              </Text>
              <Text style={[styles.welcomeBody, { color: theme.muted }]}>
                Ask me how to use Falaq, or any question about Islam: the Quran,
                salah, fasting, duas and more.
              </Text>
            </View>
            <Text style={[styles.tryLabel, { color: theme.muted }]}>
              TRY ASKING
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <PressableScale
                  key={s}
                  onPress={() => send(s)}
                  style={[
                    styles.suggestion,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  accessibilityLabel={`Ask: ${s}`}
                >
                  <Text style={[styles.suggestionText, { color: theme.text }]}>
                    {s}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </FadeIn>
        ) : null}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={styles.userRow}>
              <View
                style={[styles.userBubble, { backgroundImage: theme.primary3 }]}
              >
                <Text style={styles.userText}>{m.content}</Text>
              </View>
            </View>
          ) : (
            <View key={i} style={styles.botRow}>
              <Avatar />
              <View
                style={[
                  styles.botBubble,
                  {
                    backgroundColor: theme.surface,
                    boxShadow: theme.cardShadow,
                  },
                ]}
              >
                {m.content.trim() === OUT_OF_SCOPE_REPLY ? (
                  <Text style={[styles.outOfScope, { color: theme.text }]}>
                    {OUT_OF_SCOPE_REPLY}
                  </Text>
                ) : (
                  <Markdown
                    text={m.content}
                    color={theme.text}
                    accent={theme.primary}
                  />
                )}
              </View>
            </View>
          ),
        )}

        {busy ? (
          <View style={styles.botRow}>
            <Avatar />
            <View
              style={[
                styles.botBubble,
                { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
              ]}
            >
              {live ? (
                <Markdown
                  text={live}
                  color={theme.text}
                  accent={theme.primary}
                />
              ) : (
                <View style={styles.thinking}>
                  <TypingDots color={theme.primary} />
                  <Text style={[styles.thinkingText, { color: theme.muted }]}>
                    Thinking…
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {error ? (
          <FadeIn distance={6}>
            <View
              style={[
                styles.error,
                { backgroundColor: theme.goldSoft, borderColor: theme.gold },
              ]}
            >
              <Text style={[styles.errorText, { color: theme.text }]}>
                {error}
              </Text>
              <PressableScale
                onPress={retry}
                style={[styles.retry, { backgroundImage: theme.primary3 }]}
                accessibilityLabel="Try again"
              >
                <Text style={styles.retryText}>Try again</Text>
              </PressableScale>
            </View>
          </FadeIn>
        ) : null}
      </ScrollView>

      {/* Composer */}
      <View
        style={[
          styles.composerWrap,
          {
            backgroundColor: theme.bg,
            borderTopColor: theme.border,
            paddingBottom: keyboard
              ? keyboard + 8
              : Math.max(insets.bottom, 10) + 4,
          },
        ]}
      >
        <View style={[contentColumn, styles.composer]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask about the app or Islam…"
            placeholderTextColor={theme.muted}
            multiline
            maxLength={1000}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            accessibilityLabel="Message"
          />
          {busy ? (
            <PressableScale
              onPress={() => handle.current?.cancel()}
              style={[styles.send, { backgroundColor: theme.surfaceAlt }]}
              accessibilityLabel="Stop"
            >
              <View
                style={[styles.stopIcon, { backgroundColor: theme.text }]}
              />
            </PressableScale>
          ) : (
            <PressableScale
              onPress={() => send(draft)}
              disabled={!draft.trim()}
              style={[
                styles.send,
                { backgroundImage: theme.primary3 },
                !draft.trim() && styles.sendOff,
              ]}
              accessibilityLabel="Send"
            >
              <Text style={styles.sendIcon}>↑</Text>
            </PressableScale>
          )}
        </View>
        <Text style={[styles.disclaimer, { color: theme.muted }]}>
          AI answers can be wrong. For rulings, ask a qualified scholar.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
  },
  headerStar: { right: -40, top: -30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
    fontWeight: '300',
  },
  headerTitle: { color: onHero.text, fontSize: 18, fontWeight: '900' },
  headerSub: { color: onHero.soft, fontSize: 12.5, marginTop: 1 },
  newChat: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: onHero.faint,
    borderWidth: 1,
    borderColor: onHero.border,
  },
  newChatText: { color: onHero.text, fontSize: 13, fontWeight: '800' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: 'linear-gradient(135deg, #FFC58A 0%, #E88A5B 100%)',
  },
  avatarText: { color: '#5A1F3A', fontSize: 16, fontWeight: '900' },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  welcome: { borderRadius: 22, padding: 18 },
  welcomeTitle: { fontSize: 19, fontWeight: '900' },
  welcomeBody: { fontSize: 14.5, lineHeight: 21, marginTop: 6 },
  tryLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 8,
    marginLeft: 4,
  },
  suggestions: { gap: 8 },
  suggestion: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionText: { fontSize: 14.5, fontWeight: '700' },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: {
    maxWidth: '84%',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: { color: '#FFFFFF', fontSize: 15, lineHeight: 21 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  botBubble: {
    flexShrink: 1,
    maxWidth: '88%',
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  outOfScope: { fontSize: 15, fontWeight: '700' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thinkingText: { fontSize: 13.5, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  error: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  errorText: { fontSize: 14, lineHeight: 20 },
  retry: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: 23,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.45 },
  sendIcon: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  stopIcon: { width: 14, height: 14, borderRadius: 3 },
  disclaimer: { fontSize: 11, textAlign: 'center', marginTop: 6 },
});
