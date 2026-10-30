import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { DayPhase } from '../logic/prayerTimes';
import { onHero } from '../theme';
import { Crescent, StarField } from './Decor';

type Sky = {
  /** Tint laid over the brand-green hero. */
  tint: string;
  /** Warm glow along the horizon (bottom of the hero). */
  horizon?: string;
  /** Opacity of the star field (0 = none). */
  stars: number;
  sun?: 'rise' | 'arc' | 'set';
  moon?: number;
  /** Cloud colour as an `rgba(r,g,b,` prefix. */
  clouds?: string;
  birds?: string;
  meteors?: boolean;
};

/** Fajr → dawn, Dhuhr → day, Asr → afternoon, Maghrib → dusk, Isha → night. */
const SKIES: Record<DayPhase, Sky> = {
  dawn: {
    tint: 'linear-gradient(180deg, rgba(14,22,62,0.6) 0%, rgba(96,58,112,0.28) 55%, rgba(255,158,108,0.38) 100%)',
    horizon:
      'radial-gradient(ellipse at 18% 100%, rgba(255,176,112,0.55) 0%, rgba(255,140,100,0) 70%)',
    stars: 0.45,
    sun: 'rise',
    clouds: 'rgba(255,200,180,',
    birds: 'rgba(24,18,46,0.7)',
  },
  day: {
    tint: 'linear-gradient(180deg, rgba(255,214,170,0.18) 0%, rgba(255,214,170,0) 65%)',
    stars: 0,
    sun: 'arc',
    clouds: 'rgba(255,255,255,',
    birds: 'rgba(40,10,28,0.55)',
  },
  afternoon: {
    tint: 'linear-gradient(180deg, rgba(255,214,140,0.1) 0%, rgba(236,164,64,0.32) 100%)',
    horizon:
      'radial-gradient(ellipse at 80% 100%, rgba(255,196,96,0.35) 0%, rgba(255,196,96,0) 70%)',
    stars: 0,
    sun: 'arc',
    clouds: 'rgba(255,236,200,',
    birds: 'rgba(40,24,6,0.6)',
  },
  dusk: {
    tint: 'linear-gradient(180deg, rgba(36,14,66,0.55) 0%, rgba(164,64,84,0.3) 58%, rgba(255,136,64,0.42) 100%)',
    horizon:
      'radial-gradient(ellipse at 84% 100%, rgba(255,150,70,0.6) 0%, rgba(255,110,60,0) 70%)',
    stars: 0.6,
    sun: 'set',
    moon: 0.75,
  },
  night: {
    tint: 'linear-gradient(180deg, rgba(2,6,26,0.58) 0%, rgba(2,6,26,0.12) 100%)',
    stars: 1,
    moon: 1,
    meteors: true,
  },
};

const abs = StyleSheet.absoluteFill;
const MOON = 36;
/** Shooting-star path (down and to the left) and the matching tilt. */
const METEOR = { dx: -150, dy: 40 };
const METEOR_TILT = `${
  (-Math.atan2(METEOR.dy, -METEOR.dx) * 180) / Math.PI
}deg`;
// Shared so loops aren't restarted by a new easing function on every render.
const SINE = Easing.inOut(Easing.sin);
const EASE_OUT = Easing.out(Easing.quad);

/** Repeats `t` 0→1 forever (optionally pausing before each run). */
function useLoop(
  t: Animated.Value,
  duration: number,
  {
    run = true,
    delay = 0,
    rest = 0,
    easing = Easing.linear,
    bounce = false,
  }: {
    run?: boolean;
    delay?: number;
    rest?: number;
    easing?: (v: number) => number;
    bounce?: boolean;
  } = {},
) {
  useEffect(() => {
    if (!run) return;
    const to = (toValue: number) =>
      Animated.timing(t, {
        toValue,
        duration,
        easing,
        useNativeDriver: true,
      });
    const steps = bounce ? [to(1), to(0)] : [to(1)];
    const loop = Animated.loop(
      Animated.sequence([
        ...(delay ? [Animated.delay(delay)] : []),
        ...steps,
        ...(rest ? [Animated.delay(rest)] : []),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, run, delay, rest, easing, bounce]);
}

/** Sun with a softly breathing halo. */
function Sun({
  x,
  y,
  low,
  animate,
}: {
  x: number;
  y: number;
  low: boolean;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, 3200, {
    run: animate,
    bounce: true,
    easing: SINE,
  });
  const halo = low
    ? 'radial-gradient(circle, rgba(255,170,96,0.6) 0%, rgba(255,150,80,0.2) 35%, rgba(255,140,80,0) 70%)'
    : 'radial-gradient(circle, rgba(255,232,160,0.6) 0%, rgba(255,214,120,0.18) 35%, rgba(255,200,100,0) 70%)';
  return (
    <View style={[styles.sun, { left: x - 90, top: y - 90 }]}>
      <Animated.View
        style={[
          abs,
          {
            backgroundImage: halo,
            transform: [
              {
                scale: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.1],
                }),
              },
            ],
          },
        ]}
      />
      <View style={[styles.sunDisc, low ? styles.sunLow : styles.sunHigh]} />
    </View>
  );
}

function Moon({
  x,
  y,
  opacity,
  animate,
}: {
  x: number;
  y: number;
  opacity: number;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, 4200, {
    run: animate,
    bounce: true,
    easing: SINE,
  });
  return (
    <Animated.View
      style={[
        styles.moon,
        {
          left: x - MOON / 2,
          top: y - MOON / 2,
          opacity,
          transform: [
            {
              translateY: t.interpolate({
                inputRange: [0, 1],
                outputRange: [-2.5, 2.5],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.moonGlow} />
      <Crescent
        size={MOON}
        color={onHero.gold}
        glow="0px 0px 16px rgba(255,197,138,0.5)"
      />
    </Animated.View>
  );
}

/** A soft cloud drifting across; `offset` sets where it starts (0–1). */
function Cloud({
  color,
  top,
  width,
  duration,
  offset,
  sceneWidth,
  animate,
}: {
  color: string;
  top: number;
  width: number;
  duration: number;
  offset: number;
  sceneWidth: number;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, duration, { run: animate });
  const start = -width;
  const end = sceneWidth;
  const from = start + offset * (end - start);
  const height = width * 0.3;
  const puff = (w: number, h: number, left: number, y: number, a: number) => (
    <View
      style={[
        styles.puff,
        {
          width: w,
          height: h,
          left,
          top: y,
          backgroundImage: `radial-gradient(closest-side, ${color}${a}) 0%, ${color}${
            a * 0.4
          }) 55%, ${color}0) 100%)`,
        },
      ]}
    />
  );
  return (
    <Animated.View
      style={[
        styles.cloud,
        {
          top,
          width,
          height,
          transform: [
            {
              translateX: t.interpolate({
                inputRange: [0, 1 - offset, 1 - offset + 0.0001, 1],
                outputRange: [from, end, start, from],
              }),
            },
          ],
        },
      ]}
    >
      {puff(width, height, 0, 0, 0.3)}
      {puff(width * 0.55, height * 1.3, width * 0.18, -height * 0.4, 0.26)}
    </Animated.View>
  );
}

type BirdSpec = { dx: number; dy: number; size: number; flap: number };

/** Two wings flapping around the body (each wing pivots on the centre). */
function Bird({
  spec,
  color,
  flip,
}: {
  spec: BirdSpec;
  color: string;
  flip: boolean;
}) {
  const flap = useRef(new Animated.Value(0)).current;
  useLoop(flap, spec.flap, {
    bounce: true,
    easing: SINE,
  });
  const L = spec.size;
  const wing = (left: boolean) => (
    <Animated.View
      style={[
        styles.wingPivot,
        {
          width: L * 2,
          top: L / 2 - 0.8,
          transform: [
            {
              rotate: flap.interpolate({
                inputRange: [0, 1],
                outputRange: left ? ['30deg', '-14deg'] : ['-30deg', '14deg'],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.wing,
          left ? styles.wingLeft : { left: L },
          { width: L, backgroundColor: color },
        ]}
      />
    </Animated.View>
  );
  return (
    <Animated.View
      style={[
        styles.bird,
        {
          left: flip ? -spec.dx : spec.dx,
          top: spec.dy,
          width: L * 2,
          height: L,
          transform: [
            {
              translateY: flap.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1.6],
              }),
            },
          ],
        },
      ]}
    >
      {wing(true)}
      {wing(false)}
    </Animated.View>
  );
}

// Flat formations keep each flock inside the open sky band, clear of text
// (over Arabic, small birds could be mistaken for diacritics).
const NEAR: BirdSpec[] = [
  { dx: 0, dy: 0, size: 8, flap: 230 },
  { dx: -17, dy: 4, size: 7, flap: 260 },
  { dx: -29, dy: -3, size: 6.5, flap: 245 },
  { dx: -42, dy: 5, size: 6, flap: 280 },
  { dx: -55, dy: 1, size: 5.5, flap: 255 },
];
const FAR: BirdSpec[] = [
  { dx: 0, dy: 0, size: 4.6, flap: 300 },
  { dx: -12, dy: 3, size: 4.2, flap: 330 },
  { dx: -22, dy: -2, size: 4, flap: 310 },
];

/** A small flock gliding across the sky now and then. */
function Flock({
  birds,
  color,
  top,
  sceneWidth,
  duration,
  delay,
  rest,
  reverse = false,
  opacity = 1,
}: {
  birds: BirdSpec[];
  color: string;
  top: number;
  sceneWidth: number;
  duration: number;
  delay: number;
  rest: number;
  reverse?: boolean;
  opacity?: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, duration, { delay, rest });
  const across = reverse ? [sceneWidth + 90, -90] : [-90, sceneWidth + 90];
  return (
    <Animated.View
      style={[
        styles.flock,
        {
          top,
          opacity,
          transform: [
            {
              translateX: t.interpolate({
                inputRange: [0, 1],
                outputRange: across,
              }),
            },
            {
              translateY: t.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, -3, 2, -2, 0],
              }),
            },
          ],
        },
      ]}
    >
      {birds.map((b, i) => (
        <Bird key={i} spec={b} color={color} flip={reverse} />
      ))}
    </Animated.View>
  );
}

function ShootingStar({ x, y }: { x: number; y: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, 1000, {
    delay: 3500,
    rest: 8000,
    easing: EASE_OUT,
  });
  return (
    <Animated.View
      style={[
        styles.meteor,
        {
          left: x,
          top: y,
          opacity: t.interpolate({
            inputRange: [0, 0.15, 0.7, 1],
            outputRange: [0, 1, 0.8, 0],
          }),
          transform: [
            {
              translateX: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0, METEOR.dx],
              }),
            },
            {
              translateY: t.interpolate({
                inputRange: [0, 1],
                outputRange: [0, METEOR.dy],
              }),
            },
            { rotate: METEOR_TILT },
          ],
        },
      ]}
    />
  );
}

/** The open strip of sky (no text over it), in the scene's coordinates. */
export type SkyBand = { top: number; height: number };

/**
 * Animated sky behind the Home hero that follows the prayer times: dawn at
 * Fajr, a sun crossing the sky through the day, sunset at Maghrib and a
 * moonlit, starry night at Isha. Birds fly by in the daytime.
 */
export const SkyScene = memo(function SkySceneInner({
  phase,
  sun,
  band,
  still = false,
}: {
  phase: DayPhase;
  /** Sun position across the sky (0 sunrise → 1 Maghrib). */
  sun: number;
  /** Where the moon, sun and birds go, so they never sit behind text. */
  band: SkyBand | null;
  /** Hold the scene still (e.g. while it is off-screen). */
  still?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const reduce = reduceMotion || still;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const fade = useRef(new Animated.Value(0)).current;
  const sky = SKIES[phase];

  // Cross-fade into the new sky when the time of day changes.
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 1400,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [phase, fade]);

  const { w, h } = size;
  const bt = band?.top ?? 0;
  const bh = band?.height ?? 0;
  // The sun arcs through the open band (low at the sides, high at noon); at
  // dawn and dusk it sits just below the horizon so only its glow shows.
  const low = bt + bh + 6;
  const high = bt + 14;
  const sunPos =
    sky.sun === 'rise'
      ? { x: w * 0.16, y: h + 30 }
      : sky.sun === 'set'
      ? { x: w * 0.84, y: h + 30 }
      : {
          x: w * (0.06 + 0.88 * sun),
          y: low - (low - high) * Math.sin(Math.PI * sun),
        };

  return (
    <View
      pointerEvents="none"
      style={abs}
      onLayout={e =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
    >
      <Animated.View style={[abs, { opacity: fade }]}>
        <View style={[abs, { backgroundImage: sky.tint }]} />
        {sky.horizon ? (
          <View style={[abs, { backgroundImage: sky.horizon }]} />
        ) : null}
        {sky.stars && h ? (
          <View style={[abs, { opacity: sky.stars }]}>
            {/* Stars stay in the open sky, above the text (on a tall scene
                a dot over a word reads like a typo). */}
            <StarField
              count={22}
              height={
                band ? Math.min(h * 0.7, band.top + band.height) : h * 0.7
              }
            />
          </View>
        ) : null}
        {w && band ? (
          <>
            {sky.sun ? (
              <Sun
                x={sunPos.x}
                y={sunPos.y}
                low={sky.sun !== 'arc'}
                animate={!reduce}
              />
            ) : null}
            {sky.moon ? (
              <Moon
                x={w * 0.74}
                y={bt + bh / 2}
                opacity={sky.moon}
                animate={!reduce}
              />
            ) : null}
            {sky.clouds ? (
              <>
                <Cloud
                  color={sky.clouds}
                  top={bt - 36}
                  width={w * 0.42}
                  duration={95000}
                  offset={0.55}
                  sceneWidth={w}
                  animate={!reduce}
                />
                <Cloud
                  color={sky.clouds}
                  top={bt + bh * 0.35}
                  width={w * 0.56}
                  duration={130000}
                  offset={0.1}
                  sceneWidth={w}
                  animate={!reduce}
                />
              </>
            ) : null}
            {sky.birds && !reduce ? (
              <>
                <Flock
                  birds={FAR}
                  color={sky.birds}
                  top={bt + 6}
                  sceneWidth={w}
                  duration={26000}
                  delay={9000}
                  rest={14000}
                  reverse
                  opacity={0.6}
                />
                <Flock
                  birds={NEAR}
                  color={sky.birds}
                  top={bt + bh * 0.45}
                  sceneWidth={w}
                  duration={17000}
                  delay={1500}
                  rest={9000}
                />
              </>
            ) : null}
            {sky.meteors && !reduce ? (
              <ShootingStar x={w * 0.8} y={bt + 2} />
            ) : null}
          </>
        ) : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  sun: { position: 'absolute', width: 180, height: 180 },
  sunDisc: {
    position: 'absolute',
    left: 79,
    top: 79,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sunLow: {
    backgroundColor: '#FFB877',
    boxShadow: '0px 0px 22px rgba(255,160,90,0.9)',
  },
  sunHigh: {
    backgroundColor: '#FFF1C4',
    boxShadow: '0px 0px 22px rgba(255,224,140,0.95)',
  },
  moon: { position: 'absolute', width: MOON, height: MOON },
  moonGlow: {
    position: 'absolute',
    left: (MOON - 150) / 2,
    top: (MOON - 150) / 2,
    width: 150,
    height: 150,
    backgroundImage:
      'radial-gradient(circle, rgba(255,197,138,0.3) 0%, rgba(255,197,138,0) 70%)',
  },
  cloud: { position: 'absolute', left: 0 },
  puff: { position: 'absolute' },
  flock: { position: 'absolute', left: 0, width: 1, height: 1 },
  bird: { position: 'absolute' },
  wingPivot: { position: 'absolute', left: 0, height: 1.6 },
  wing: { position: 'absolute', top: 0, height: 1.6, borderRadius: 1 },
  wingLeft: { left: 0 },
  meteor: {
    position: 'absolute',
    width: 80,
    height: 1.6,
    borderRadius: 1,
    backgroundImage:
      'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
  },
});
