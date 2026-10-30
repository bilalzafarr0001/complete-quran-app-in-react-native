import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { ChatSupportCard } from '../components/ChatSupportCard';
import { FadeIn } from '../components/FadeIn';
import { LocationPicker } from '../components/LocationPicker';
import { PressableScale } from '../components/PressableScale';
import { ReciterList } from '../components/ReciterList';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { defaultsForCountry } from '../data/places';
import { getReciter } from '../data/reciters';
import { useAdhanControls } from '../hooks/useAdhanControls';
import { usePlace, usePrayerData } from '../hooks/usePrayerData';
import { contentColumn } from '../hooks/useResponsive';
import { dateKey } from '../logic/dates';
import { DUROOD_HOUR } from '../logic/friday';
import { formatHijri } from '../logic/hijri';
import { SEHRI_OPTIONS } from '../logic/ramadan';
import {
  formatTime,
  METHODS,
  MethodId,
  PRAYER_LABELS,
} from '../logic/prayerTimes';
import { formatOffset, offsetAt } from '../logic/timezone';
import { useNav } from '../navigation/nav';
import {
  openExactAlarmSettings,
  openNotificationSettings,
  sendTestAdhan,
} from '../services/adhan';
import { clearDownloads, downloadedSurahs } from '../services/quran';
import {
  AlertMode,
  NotifySettings,
  SalahKey,
  ThemeMode,
  Translation,
  useStore,
} from '../store';
import { useTheme } from '../theme';

/** A small rounded tile holding an icon (rows and section headers). */
function IconTile({ icon, small }: { icon: string; small?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        small ? styles.tileSmall : styles.tile,
        { backgroundColor: theme.primarySoft },
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={small ? styles.tileIconSmall : styles.tileIcon}
      >
        {icon}
      </Text>
    </View>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <IconTile icon={icon} small />
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.sectionTitle, { color: theme.muted }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>
      <View
        style={[
          styles.group,
          { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityLabel={label}
      style={[
        styles.row,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
      ]}
    >
      <IconTile icon={icon} />
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        {value ? (
          <Text
            style={[styles.rowHint, { color: theme.muted }]}
            numberOfLines={2}
          >
            {value}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
    </PressableScale>
  );
}

/** A setting whose control sits under its label (segmented choices). */
function ControlRow({
  icon,
  label,
  hint,
  first,
  children,
}: {
  icon: string;
  label: string;
  hint?: string;
  first?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.control,
        !first && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.controlHead}>
        <IconTile icon={icon} />
        <View style={styles.flex}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
          {hint ? (
            <Text style={[styles.rowHint, { color: theme.muted }]}>{hint}</Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

/** A setting with an on/off switch. */
function SwitchRow({
  icon,
  label,
  hint,
  value,
  onChange,
  first,
}: {
  icon: string;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        !first && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
      ]}
    >
      <IconTile icon={icon} />
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: theme.muted }]}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#FFFFFF"
        accessibilityLabel={label}
      />
    </View>
  );
}

function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = String,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <PressableScale
        style={[styles.stepBtn, { backgroundColor: theme.surfaceAlt }]}
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        accessibilityLabel={`Decrease ${label}`}
      >
        <Text style={[styles.stepText, { color: theme.text }]}>−</Text>
      </PressableScale>
      <Text style={[styles.stepValue, { color: theme.text }]}>
        {format(value)}
      </Text>
      <PressableScale
        style={[styles.stepBtn, { backgroundColor: theme.surfaceAlt }]}
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        accessibilityLabel={`Increase ${label}`}
      >
        <Text style={[styles.stepText, { color: theme.text }]}>+</Text>
      </PressableScale>
    </View>
  );
}

function Option({
  label,
  sub,
  selected,
  onPress,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      style={[
        styles.option,
        {
          backgroundColor: selected ? theme.primarySoft : theme.surfaceAlt,
          borderColor: selected ? theme.primary : theme.surfaceAlt,
        },
      ]}
    >
      <View style={styles.flex}>
        <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
        {sub ? (
          <Text style={[styles.optionSub, { color: theme.muted }]}>{sub}</Text>
        ) : null}
      </View>
      {selected ? (
        <Text style={[styles.optionCheck, { color: theme.primary }]}>✓</Text>
      ) : null}
    </PressableScale>
  );
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

const SALAH: SalahKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function Notice({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  const theme = useTheme();
  return (
    <FadeIn distance={8}>
      <View
        style={[
          styles.notice,
          { backgroundColor: theme.goldSoft, borderColor: theme.gold },
        ]}
      >
        <Text style={styles.noticeIcon}>{icon}</Text>
        <View style={styles.flex}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.rowHint, { color: theme.muted }]}>{body}</Text>
          <PressableScale
            onPress={onAction}
            style={[styles.noticeBtn, { backgroundImage: theme.primary3 }]}
            accessibilityLabel={action}
          >
            <Text style={styles.noticeBtnText}>{action}</Text>
          </PressableScale>
        </View>
      </View>
    </FadeIn>
  );
}

/** Adhan alerts: master switch, per-prayer sound, reminders, tests. */
const PRAYER_ICON: Record<SalahKey, string> = {
  fajr: '🌅',
  dhuhr: '☀️',
  asr: '🌤️',
  maghrib: '🌇',
  isha: '🌙',
};

function AdhanSettings() {
  const theme = useTheme();
  const { place } = usePlace();
  const c = useAdhanControls();
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const on = c.settings.enabled && !c.blocked;

  const test = async (fajr: boolean) => {
    const ok = c.settings.enabled || (await c.enable());
    if (!ok) return;
    try {
      await sendTestAdhan(place, fajr, c.settings.adhanLength);
      setTestMsg(`${fajr ? 'Fajr adhan' : 'Adhan'} arrives in 5 seconds…`);
    } catch {
      setTestMsg('Could not schedule the test notification.');
    }
    setTimeout(() => setTestMsg(null), 7000);
  };

  return (
    <View>
      <Section title="ADHAN & REMINDERS" icon="🔔">
        <View style={styles.row}>
          <IconTile icon="🔔" />
          <View style={styles.flex}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              Prayer notifications
            </Text>
            <Text style={[styles.rowHint, { color: theme.muted }]}>
              {on
                ? `Next 7 days scheduled for ${place.name}. Updates automatically.`
                : 'Hear the adhan at every prayer time, even when Falaq is closed.'}
            </Text>
          </View>
          {c.busy ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <Switch
              value={on}
              onValueChange={v => {
                if (v) c.enable();
                else c.disable();
              }}
              trackColor={{ true: theme.primary, false: theme.border }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Prayer notifications"
            />
          )}
        </View>
        {on
          ? SALAH.map(k => (
              <View
                key={k}
                style={[
                  styles.row,
                  styles.rowTight,
                  {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border,
                  },
                ]}
              >
                <IconTile icon={PRAYER_ICON[k]} small />
                <View style={styles.flex}>
                  <Text
                    numberOfLines={1}
                    style={[styles.rowLabel, { color: theme.text }]}
                  >
                    {PRAYER_LABELS[k].en}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.rowHint, { color: theme.muted }]}
                  >
                    {k === 'fajr' && c.settings.modes[k] === 'adhan'
                      ? 'Fajr adhan'
                      : k === 'dhuhr'
                      ? "Jumu'ah on Fridays"
                      : PRAYER_LABELS[k].ar}
                  </Text>
                </View>
                <View style={styles.modePicker}>
                  <Segmented<AlertMode>
                    value={c.settings.modes[k]}
                    onChange={v => c.setAlertMode(k, v)}
                    options={[
                      { value: 'adhan', label: 'Adhan' },
                      { value: 'beep', label: 'Sound' },
                      { value: 'off', label: 'Off' },
                    ]}
                  />
                </View>
              </View>
            ))
          : null}
        {on ? (
          <SwitchRow
            icon="🌄"
            label="Sunrise alert"
            hint="Know when Fajr time ends"
            value={c.settings.sunrise}
            onChange={v => c.updateNotifications({ sunrise: v })}
          />
        ) : null}
        {on ? (
          <SwitchRow
            icon="🤲"
            label="Friday Durood reminder"
            hint={`Jumu'ah Mubarak at ${formatTime(
              DUROOD_HOUR,
            )}, with a reminder to send Durood`}
            value={c.settings.durood}
            onChange={v => c.updateNotifications({ durood: v })}
          />
        ) : null}
      </Section>

      {c.error || c.blocked ? (
        <Notice
          icon="🔕"
          title="Notifications are blocked"
          body={
            c.error ??
            'Falaq can’t show prayer alerts until notifications are allowed for it.'
          }
          action="Open settings"
          onAction={openNotificationSettings}
        />
      ) : null}

      {on && c.perm && !c.perm.exactAlarms ? (
        <Notice
          icon="⏰"
          title="Allow exact alarms"
          body="Turn on “Alarms & reminders” for Falaq so the adhan plays exactly on time, even when the phone is asleep."
          action="Allow"
          onAction={openExactAlarmSettings}
        />
      ) : null}

      {on ? (
        <Section title="ALERT OPTIONS" icon="⏰">
          <ControlRow
            first
            icon="📢"
            label="Adhan at prayer time"
            hint={
              c.settings.adhanLength === 'short'
                ? 'The opening “Allahu Akbar, Allahu Akbar” (about 20 seconds)'
                : 'The complete adhan (about 3 minutes)'
            }
          >
            <Segmented<NotifySettings['adhanLength']>
              value={c.settings.adhanLength}
              onChange={v => c.updateNotifications({ adhanLength: v })}
              options={[
                { value: 'short', label: 'Allahu Akbar' },
                { value: 'full', label: 'Full adhan' },
              ]}
            />
          </ControlRow>
          <ControlRow
            icon="⏳"
            label="Remind me before each prayer"
            hint="A heads-up so you can prepare"
          >
            <Segmented<NotifySettings['reminderMinutes']>
              value={c.settings.reminderMinutes}
              onChange={v => c.updateNotifications({ reminderMinutes: v })}
              options={[
                { value: 0, label: 'Off' },
                { value: 10, label: '10 min' },
                { value: 15, label: '15 min' },
                { value: 30, label: '30 min' },
              ]}
            />
          </ControlRow>
          <ControlRow
            icon="🌙"
            label="Sehri reminder"
            hint="During Ramadan, before Fajr (end of Sehri)"
          >
            <Segmented<NotifySettings['sehriMinutes']>
              value={c.settings.sehriMinutes}
              onChange={v => c.updateNotifications({ sehriMinutes: v })}
              options={SEHRI_OPTIONS}
            />
          </ControlRow>
        </Section>
      ) : null}

      <View style={styles.testRow}>
        <PressableScale
          onPress={() => test(false)}
          style={[
            styles.testBtn,
            { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
          ]}
          accessibilityLabel="Test adhan"
        >
          <Text style={[styles.testText, { color: theme.primary }]}>
            ▶︎ Test adhan
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() => test(true)}
          style={[
            styles.testBtn,
            { backgroundColor: theme.surface, boxShadow: theme.cardShadow },
          ]}
          accessibilityLabel="Test Fajr adhan"
        >
          <Text style={[styles.testText, { color: theme.primary }]}>
            ▶︎ Test Fajr adhan
          </Text>
        </PressableScale>
      </View>
      {testMsg ? (
        <FadeIn distance={6}>
          <Text style={[styles.testMsg, { color: theme.primary }]}>
            {testMsg}
          </Text>
        </FadeIn>
      ) : null}
    </View>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const nav = useNav();
  const { state, update, setPlace, resetOnboarding } = useStore();
  const { place, isDefaultPlace, hijri, date } = usePrayerData(60000);
  const [sheet, setSheet] = useState<'location' | 'method' | 'reciter' | null>(
    null,
  );
  const [downloaded, setDownloaded] = useState<number | null>(null);

  useEffect(() => {
    downloadedSurahs().then(list => setDownloaded(list.length));
  }, []);

  const synced = state.hijriSyncedOn === dateKey(date);
  // The method used in the user's country (picked for them automatically).
  const recommended =
    !isDefaultPlace && place.countryCode
      ? defaultsForCountry(place.countryCode).method
      : null;
  const country = place.country || place.name;

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          back
          title="Settings"
          arabic="الإعدادات"
          subtitle={state.name ? `Assalamu alaikum, ${state.name}` : undefined}
        />

        <FadeIn delay={30} style={contentColumn}>
          <ChatSupportCard />
        </FadeIn>

        <FadeIn delay={60} style={contentColumn}>
          <Section title="LOCATION" icon="📍">
            <PressableScale
              onPress={() => setSheet('location')}
              scaleTo={0.98}
              style={styles.placeRow}
              accessibilityLabel="Change location"
            >
              <IconTile icon="📍" />
              <View style={styles.flex}>
                <Text
                  numberOfLines={1}
                  style={[styles.placeName, { color: theme.text }]}
                >
                  {isDefaultPlace ? 'Location not set' : place.name}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.placeSub, { color: theme.muted }]}
                >
                  {isDefaultPlace
                    ? 'Showing Makkah times. Tap to detect your location.'
                    : `${[place.region, place.country]
                        .filter(Boolean)
                        .join(', ')} · ${formatOffset(
                        offsetAt(place, Date.now()),
                      )}${place.source === 'gps' ? ' · GPS' : ''}`}
                </Text>
              </View>
              <Text style={[styles.change, { color: theme.primary }]}>
                Change ›
              </Text>
            </PressableScale>
          </Section>

          <Section title="PRAYER CALCULATION" icon="🕌">
            <Row
              icon="🧮"
              label="Calculation method"
              value={`${METHODS[state.method].name}${
                recommended === state.method
                  ? ` · Recommended for ${country}`
                  : ''
              }`}
              onPress={() => setSheet('method')}
            />
            <ControlRow
              icon="🌤️"
              label="Asr time"
              hint={
                state.madhab === 'hanafi'
                  ? 'Hanafi: Asr begins when a shadow is twice its length'
                  : "Standard (Shafi'i, Maliki, Hanbali): shadow equal to its length"
              }
            >
              <Segmented
                value={state.madhab}
                onChange={v => update({ madhab: v })}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'hanafi', label: 'Hanafi' },
                ]}
              />
            </ControlRow>
          </Section>

          <Section title="ISLAMIC DATE" icon="🌙">
            <View style={styles.row}>
              <IconTile icon="📅" />
              <View style={styles.flex}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>
                  {formatHijri(hijri)}
                </Text>
                <Text style={[styles.rowHint, { color: theme.muted }]}>
                  {synced
                    ? 'Synced with the official calendar'
                    : 'Calculated on device (offline)'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.row,
                styles.rowTight,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border,
                },
              ]}
            >
              <IconTile icon="🔭" />
              <Text
                style={[styles.rowLabel, styles.flex, { color: theme.text }]}
              >
                Adjust for local moon sighting
              </Text>
              <Stepper
                label="Hijri adjustment"
                value={state.hijriOffset}
                onChange={v => update({ hijriOffset: v })}
                min={-2}
                max={2}
                format={signed}
              />
            </View>
          </Section>
        </FadeIn>

        <FadeIn delay={90} style={contentColumn}>
          <AdhanSettings />
          <Section title="QURAN AUDIO" icon="🎧">
            <Row
              icon="🎙️"
              label="Reciter"
              value={getReciter(state.reciterId).name}
              onPress={() => setSheet('reciter')}
            />
            <SwitchRow
              first
              icon="📖"
              label="Follow along"
              hint="Scroll to and highlight the ayah being recited"
              value={state.followAlong}
              onChange={v => update({ followAlong: v })}
            />
          </Section>
        </FadeIn>

        <FadeIn delay={120} style={contentColumn}>
          <Section title="DISPLAY & READING" icon="🎨">
            <ControlRow first icon="🌗" label="Theme">
              <Segmented<ThemeMode>
                value={state.themeMode}
                onChange={v => update({ themeMode: v })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </ControlRow>
            <ControlRow icon="🌐" label="Quran translation">
              <Segmented<Translation>
                value={state.translation}
                onChange={v => update({ translation: v })}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ur', label: 'Urdu' },
                  { value: 'both', label: 'Both' },
                  { value: 'off', label: 'Off' },
                ]}
              />
            </ControlRow>
            <View
              style={[
                styles.row,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border,
                },
              ]}
            >
              <IconTile icon="🔤" />
              <Text
                style={[styles.rowLabel, styles.flex, { color: theme.text }]}
              >
                Arabic text size
              </Text>
              <Stepper
                label="Arabic text size"
                value={state.arabicSize}
                onChange={v => update({ arabicSize: v })}
                min={20}
                max={44}
                step={2}
              />
            </View>
            <View
              style={[
                styles.row,
                {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border,
                },
              ]}
            >
              <IconTile icon="💾" />
              <View style={styles.flex}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>
                  Saved for offline
                </Text>
                <Text style={[styles.rowHint, { color: theme.muted }]}>
                  {downloaded === null
                    ? 'Checking…'
                    : `${downloaded} of 114 surahs on this device`}
                </Text>
              </View>
              {downloaded ? (
                <PressableScale
                  style={[styles.clear, { backgroundColor: theme.surfaceAlt }]}
                  onPress={() => clearDownloads().then(() => setDownloaded(0))}
                  accessibilityLabel="Clear downloaded surahs"
                >
                  <Text style={[styles.clearText, { color: theme.danger }]}>
                    Clear
                  </Text>
                </PressableScale>
              ) : null}
            </View>
          </Section>
        </FadeIn>

        <FadeIn delay={180} style={contentColumn}>
          <Section title="ABOUT" icon="ℹ️">
            <Row
              icon="🔁"
              label="Replay onboarding"
              value="See the welcome screens again"
              last
              onPress={() => {
                nav.pop();
                setTimeout(resetOnboarding, 250);
              }}
            />
          </Section>
          <Text style={[styles.footnote, { color: theme.muted }]}>
            Prayer times are calculated on your device from your location, so
            they work offline. City names, time zones, weather, Hijri dates and
            Quran text are fetched online and saved for offline use.
          </Text>
        </FadeIn>
      </ScrollView>

      <BottomSheet
        visible={sheet === 'location'}
        title="Your location"
        onClose={() => setSheet(null)}
      >
        <LocationPicker
          onPicked={p => {
            setPlace(p);
            setSheet(null);
          }}
        />
        <View style={styles.sheetSpacer} />
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'reciter'}
        title="Reciter"
        onClose={() => setSheet(null)}
      >
        <ReciterList onPicked={() => setSheet(null)} />
      </BottomSheet>
      <BottomSheet
        visible={sheet === 'method'}
        title="Calculation method"
        onClose={() => setSheet(null)}
      >
        <Text style={[styles.sheetNote, { color: theme.muted }]}>
          {recommended
            ? `Falaq uses the method followed in ${country} automatically. Change it only if your local mosque follows a different one.`
            : 'Methods differ in the sun angles used for Fajr and Isha. Choose the one your local mosque follows.'}
        </Text>
        {(Object.keys(METHODS) as MethodId[]).map(id => {
          const m = METHODS[id];
          return (
            <Option
              key={id}
              label={id === recommended ? `${m.name} (Recommended)` : m.name}
              sub={`Fajr ${m.fajr}° · Isha ${
                m.ishaMinutes
                  ? `${m.ishaMinutes} min after Maghrib`
                  : `${m.isha}°`
              }`}
              selected={id === state.method}
              onPress={() => {
                update({ method: id });
                setSheet(null);
              }}
            />
          );
        })}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 40 },
  section: { marginTop: 22, marginHorizontal: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: { fontSize: 17 },
  tileSmall: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconSmall: { fontSize: 12 },
  control: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  controlHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetNote: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  group: { borderRadius: 20, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  rowLabel: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  rowTight: { paddingVertical: 10 },
  rowHint: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  chevron: { fontSize: 22, fontWeight: '600' },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  placeName: { fontSize: 16, fontWeight: '800' },
  placeSub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  change: { fontSize: 14, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 20, fontWeight: '700' },
  stepValue: {
    fontSize: 15,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  clear: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  clearText: { fontSize: 13, fontWeight: '800' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
  },
  optionLabel: { fontSize: 15, fontWeight: '700' },
  optionSub: { fontSize: 12.5, marginTop: 2 },
  optionCheck: { fontSize: 18, fontWeight: '900' },
  modePicker: { width: 196 },
  notice: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  noticeIcon: { fontSize: 22 },
  noticeBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  noticeBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  testRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
  },
  testBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testText: { fontSize: 14, fontWeight: '800' },
  testMsg: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    marginHorizontal: 22,
    marginTop: 18,
  },
  sheetSpacer: { height: 12 },
});
