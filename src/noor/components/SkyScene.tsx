import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { DayPhase } from '../logic/prayerTimes';
import type { SkyWeather } from '../logic/weather';
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
    moon: 0.7,
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
    moon: 0.9,
  },
  night: {
    tint: 'linear-gradient(180deg, rgba(2,6,26,0.58) 0%, rgba(2,6,26,0.12) 100%)',
    stars: 1,
    moon: 1,
    meteors: true,
  },
};

const abs = StyleSheet.absoluteFill;
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

const HALO_LOW =
  'radial-gradient(circle, rgba(255,170,96,0.6) 0%, rgba(255,150,80,0.2) 35%, rgba(255,140,80,0) 70%)';
const HALO_HIGH =
  'radial-gradient(circle, rgba(255,226,160,0.42) 0%, rgba(255,214,120,0.12) 40%, rgba(255,200,100,0) 70%)';

/**
 * The sun: by day a large glowing disc (as in the Five Skies design); at dawn
 * and dusk it's below the horizon, so only its glow shows.
 */
function Sun({
  x,
  y,
  size,
  low,
  warm,
  opacity,
  animate,
}: {
  x: number;
  y: number;
  /** Disc diameter (glow-only suns use it for the glow). */
  size: number;
  low: boolean;
  /** Afternoon colours (deeper amber) rather than the white midday sun. */
  warm: boolean;
  /** Dimmed behind clouds. */
  opacity: number;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, 3200, {
    run: animate,
    bounce: true,
    easing: SINE,
  });
  const halo = low ? size : size * 2.1;
  return (
    <View
      style={[
        styles.sun,
        {
          left: x - halo / 2,
          top: y - halo / 2,
          width: halo,
          height: halo,
          opacity,
        },
      ]}
    >
      <Animated.View
        style={[
          abs,
          {
            backgroundImage: low ? HALO_LOW : HALO_HIGH,
            transform: [
              {
                scale: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.08],
                }),
              },
            ],
          },
        ]}
      />
      {low ? null : (
        <View
          style={[
            styles.sunDisc,
            warm ? styles.sunWarm : styles.sunBright,
            {
              left: (halo - size) / 2,
              top: (halo - size) / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      )}
    </View>
  );
}

/**
 * The moon after sunset and before sunrise: a large crescent (the same size
 * as the daytime sun) with a soft glow and the faint rest of its disc.
 */
function Moon({
  x,
  y,
  size,
  opacity,
  animate,
}: {
  x: number;
  y: number;
  size: number;
  opacity: number;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, 4200, {
    run: animate,
    bounce: true,
    easing: SINE,
  });
  const glow = size * 1.9;
  return (
    <Animated.View
      style={[
        styles.moon,
        {
          left: x - glow / 2,
          top: y - glow / 2,
          width: glow,
          height: glow,
          opacity,
          transform: [
            {
              translateY: t.interpolate({
                inputRange: [0, 1],
                outputRange: [-3, 3],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[abs, styles.moonGlow]} />
      <View
        style={[
          styles.moonBody,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
      <Crescent
        size={size}
        color={onHero.gold}
        glow={`0px 0px ${Math.round(size * 0.22)}px rgba(255,197,138,0.45)`}
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
  density = 1,
}: {
  color: string;
  top: number;
  width: number;
  duration: number;
  offset: number;
  sceneWidth: number;
  animate: boolean;
  /** Thicker clouds on overcast days. */
  density?: number;
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
      {puff(width, height, 0, 0, 0.3 * density)}
      {puff(
        width * 0.55,
        height * 1.3,
        width * 0.18,
        -height * 0.4,
        0.26 * density,
      )}
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

/** Same pseudo-random numbers on every render (drops don't jump around). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type PrecipSpec = {
  count: number;
  /** Time for the sheet to fall one scene height. */
  duration: number;
  seed: number;
  /** Drop length (or flake size) range. */
  size: [number, number];
  thickness: number;
  alpha: number;
  flake?: boolean;
};

const PRECIP: Record<'drizzle' | 'rain' | 'snow', PrecipSpec[]> = {
  drizzle: [
    {
      count: 34,
      duration: 1700,
      seed: 5,
      size: [7, 12],
      thickness: 1,
      alpha: 0.32,
    },
  ],
  rain: [
    {
      count: 42,
      duration: 1400,
      seed: 7,
      size: [12, 18],
      thickness: 1,
      alpha: 0.26,
    },
    {
      count: 26,
      duration: 850,
      seed: 11,
      size: [18, 28],
      thickness: 1.6,
      alpha: 0.4,
    },
  ],
  snow: [
    {
      count: 34,
      duration: 12000,
      seed: 3,
      size: [3, 6],
      thickness: 0,
      alpha: 0.85,
      flake: true,
    },
  ],
};

/**
 * Falling rain or snow: a sheet of drops twice the scene's height scrolls
 * down forever (its two halves match, so the loop is seamless).
 */
function PrecipLayer({
  spec,
  w,
  h,
  animate,
}: {
  spec: PrecipSpec;
  w: number;
  h: number;
  animate: boolean;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useLoop(fall, spec.duration, { run: animate });
  useLoop(sway, 3600, {
    run: animate && !!spec.flake,
    bounce: true,
    easing: SINE,
  });
  const drops = useMemo(() => {
    const r = seeded(spec.seed);
    return Array.from({ length: spec.count }, () => ({
      x: r() * w,
      y: r() * h,
      size: spec.size[0] + r() * (spec.size[1] - spec.size[0]),
    }));
  }, [spec, w, h]);
  const sheet = (dy: number) =>
    drops.map((d, i) => (
      <View
        key={`${dy}-${i}`}
        style={[
          styles.drop,
          spec.flake
            ? {
                left: d.x,
                top: d.y + dy,
                width: d.size,
                height: d.size,
                borderRadius: d.size / 2,
                backgroundColor: `rgba(255,255,255,${spec.alpha})`,
              }
            : {
                left: d.x,
                top: d.y + dy,
                width: spec.thickness,
                height: d.size,
                borderRadius: spec.thickness,
                backgroundColor: `rgba(220,230,255,${spec.alpha})`,
              },
        ]}
      />
    ));
  return (
    <Animated.View
      style={[
        styles.precip,
        {
          top: -h,
          height: h * 2,
          transform: [
            {
              translateY: fall.interpolate({
                inputRange: [0, 1],
                outputRange: [0, h],
              }),
            },
            {
              translateX: sway.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 6],
              }),
            },
          ],
        },
      ]}
    >
      {sheet(0)}
      {sheet(h)}
    </Animated.View>
  );
}

/** A storm's lightning: a double flash every few seconds. */
function Lightning() {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, 900, { delay: 2500, rest: 7500 });
  return (
    <Animated.View
      style={[
        abs,
        styles.flash,
        {
          opacity: t.interpolate({
            inputRange: [0, 0.08, 0.16, 0.3, 0.42, 1],
            outputRange: [0, 0.42, 0.05, 0.3, 0, 0],
          }),
        },
      ]}
    />
  );
}

/** How the weather changes the sky. */
type Look = {
  /** How many clouds drift by. */
  clouds: number;
  /** Overcast cloud colour (day / night), as an `rgba(r,g,b,` prefix. */
  overcast?: [string, string];
  /** Greys the whole sky. */
  veil?: string;
  haze?: boolean;
  sun: number;
  moon: number;
  stars: number;
  precip?: 'drizzle' | 'rain' | 'snow';
  lightning?: boolean;
  birds: boolean;
};

const LOOKS: Record<SkyWeather, Look> = {
  clear: { clouds: 0, sun: 1, moon: 1, stars: 1, birds: true },
  partly: { clouds: 2, sun: 1, moon: 1, stars: 0.8, birds: true },
  cloudy: {
    clouds: 5,
    overcast: ['rgba(226,226,236,', 'rgba(150,150,178,'],
    veil: 'linear-gradient(180deg, rgba(56,58,80,0.36) 0%, rgba(56,58,80,0.12) 100%)',
    sun: 0.4,
    moon: 0.45,
    stars: 0.15,
    birds: true,
  },
  fog: {
    clouds: 3,
    overcast: ['rgba(236,236,242,', 'rgba(170,170,190,'],
    haze: true,
    sun: 0.5,
    moon: 0.4,
    stars: 0,
    birds: false,
  },
  drizzle: {
    clouds: 5,
    overcast: ['rgba(206,210,226,', 'rgba(140,142,170,'],
    veil: 'linear-gradient(180deg, rgba(44,48,72,0.42) 0%, rgba(44,48,72,0.16) 100%)',
    sun: 0.22,
    moon: 0.25,
    stars: 0,
    precip: 'drizzle',
    birds: false,
  },
  rain: {
    clouds: 6,
    overcast: ['rgba(176,182,204,', 'rgba(120,124,154,'],
    veil: 'linear-gradient(180deg, rgba(26,30,52,0.55) 0%, rgba(26,30,52,0.22) 100%)',
    sun: 0,
    moon: 0,
    stars: 0,
    precip: 'rain',
    birds: false,
  },
  snow: {
    clouds: 5,
    overcast: ['rgba(238,240,250,', 'rgba(170,174,200,'],
    veil: 'linear-gradient(180deg, rgba(110,118,150,0.4) 0%, rgba(190,198,226,0.14) 100%)',
    sun: 0.15,
    moon: 0.2,
    stars: 0,
    precip: 'snow',
    birds: false,
  },
  storm: {
    clouds: 6,
    overcast: ['rgba(132,136,164,', 'rgba(96,98,128,'],
    veil: 'linear-gradient(180deg, rgba(14,14,34,0.66) 0%, rgba(14,14,34,0.3) 100%)',
    sun: 0,
    moon: 0,
    stars: 0,
    precip: 'rain',
    lightning: true,
    birds: false,
  },
};

/** The Five Skies design's sky (option E): burnt orange to rose to plum. */
const SUNNY_SKY =
  'linear-gradient(180deg, #9E3F1E 0%, #C4602F 34%, #A2445A 62%, #3A1630 100%)';

/** Clouds after dark (when the forecast says there are some). */
const NIGHT_CLOUD = 'rgba(186,182,212,';

/** Where each cloud drifts (in order of appearance as the sky clouds over). */
const CLOUD_SLOTS: {
  /** Vertical place: in the open band, or by the title (over the sun). */
  at: 'bandTop' | 'bandMid' | 'title' | 'titleLow' | 'high' | 'low';
  width: number;
  duration: number;
  offset: number;
}[] = [
  { at: 'bandTop', width: 0.42, duration: 95000, offset: 0.55 },
  { at: 'bandMid', width: 0.56, duration: 130000, offset: 0.1 },
  { at: 'title', width: 0.5, duration: 110000, offset: 0.8 },
  { at: 'titleLow', width: 0.62, duration: 150000, offset: 0.35 },
  { at: 'high', width: 0.7, duration: 170000, offset: 0.2 },
  { at: 'low', width: 0.48, duration: 120000, offset: 0.65 },
];

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
  title = null,
  weather = null,
  cloud = null,
  sunny = 0,
  still = false,
}: {
  phase: DayPhase;
  /** Sun position across the sky (0 sunrise → 1 Maghrib). */
  sun: number;
  /** Where the moon and birds go, so they never sit behind text. */
  band: SkyBand | null;
  /** The prayer's name block: the big daytime sun sits beside it. */
  title?: SkyBand | null;
  /** Forecast for this prayer's time (null = no data: the usual sky). */
  weather?: SkyWeather | null;
  /** 0–1: how cloudy the sky is (null = no data). */
  cloud?: number | null;
  /** 0–1: how sunny; sunny days take on the Five Skies design's warm sky. */
  sunny?: number;
  /** Hold the scene still (e.g. while it is off-screen). */
  still?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const reduce = reduceMotion || still;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const appear = useRef(new Animated.Value(0)).current;
  const sky = SKIES[phase];
  const look = LOOKS[weather ?? 'partly'];
  const night = phase !== 'day' && phase !== 'afternoon';
  // With a forecast, the amount of cloud follows the hour's cloud cover
  // (rain, snow, storms and fog keep their own heavy skies).
  const wet = !!look.precip || !!look.haze;
  const cover = weather && cloud !== null && !wet ? cloud : null;
  const heavy = cover === null ? !!look.overcast : cover >= 0.75;
  const overcast = look.overcast ?? (heavy ? LOOKS.cloudy.overcast : undefined);
  const cloudCount =
    cover === null ? look.clouds : Math.round(cover * CLOUD_SLOTS.length);
  const fade = (from: number, floor: number) =>
    cover === null || cover < from
      ? 1
      : Math.max(floor, 1 - ((cover - from) / (1 - from)) * (1 - floor));
  const sunVisible = cover === null ? look.sun : fade(0.5, 0.4);
  const moonVisible = cover === null ? look.moon : fade(0.5, 0.45);
  const starsVisible =
    cover === null ? look.stars : Math.max(0, 1 - cover * 1.25);
  const veil =
    cover === null
      ? look.veil
      : cover >= 0.6
      ? `linear-gradient(180deg, rgba(56,58,80,${(
          0.38 *
          ((cover - 0.6) / 0.4)
        ).toFixed(2)}) 0%, rgba(56,58,80,${(
          0.13 *
          ((cover - 0.6) / 0.4)
        ).toFixed(2)}) 100%)`
      : undefined;

  // Cross-fade into the new sky when the time of day changes.
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, {
      toValue: 1,
      duration: 1400,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [phase, appear]);

  const { w, h } = size;
  const bt = band?.top ?? 0;
  const bh = band?.height ?? 0;
  const head = title ?? { top: bt + bh, height: 150 };
  // By day a big sun sits on the right, partly off the edge: high in the open
  // sky around noon (beside the name if there's little sky), sinking to the
  // name's level and further out towards Maghrib. At dawn and dusk it's just
  // below the horizon, so only its glow shows.
  const disc = Math.round(Math.min(190, Math.max(130, w * 0.42)));
  const p = Math.min(1, Math.max(0.3, sun));
  const sunLow = head.top + head.height * 0.6;
  const sunHigh = bh >= disc ? bt + bh * 0.42 : head.top + head.height * 0.15;
  const sunPos =
    sky.sun === 'rise'
      ? { x: w * 0.16, y: h + 40 }
      : sky.sun === 'set'
      ? { x: w * 0.84, y: h + 40 }
      : {
          x: w - disc * (0.7 - 0.5 * p),
          y: sunLow - (sunLow - sunHigh) * Math.sin(Math.PI * p),
        };
  const cloudTop = {
    bandTop: bt - 36,
    bandMid: bt + bh * 0.35,
    title: head.top - 10,
    titleLow: head.top + head.height * 0.55,
    high: bt - 70,
    low: head.top + head.height + 30,
  };
  const cloudColor = overcast
    ? overcast[night ? 1 : 0]
    : sky.clouds ?? (cover !== null ? NIGHT_CLOUD : undefined);
  const clouds = cloudColor ? CLOUD_SLOTS.slice(0, cloudCount) : [];
  const density = cover !== null ? 1 + cover * 0.9 : look.overcast ? 1.8 : 1;

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
      <Animated.View style={[abs, { opacity: appear }]}>
        <View style={[abs, { backgroundImage: sky.tint }]} />
        {sky.horizon ? (
          <View style={[abs, { backgroundImage: sky.horizon }]} />
        ) : null}
        {sky.sun === 'arc' && sunny ? (
          // A sunny day: the warm sky of the Five Skies design.
          <View style={[abs, { backgroundImage: SUNNY_SKY, opacity: sunny }]} />
        ) : null}
        {veil ? <View style={[abs, { backgroundImage: veil }]} /> : null}
        {sky.stars * starsVisible && h ? (
          <View style={[abs, { opacity: sky.stars * starsVisible }]}>
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
            {sky.sun && sunVisible ? (
              <Sun
                x={sunPos.x}
                y={sunPos.y}
                size={sky.sun === 'arc' ? disc : Math.max(300, disc * 1.7)}
                low={sky.sun !== 'arc'}
                warm={phase === 'afternoon'}
                opacity={sunVisible}
                animate={!reduce}
              />
            ) : null}
            {sky.moon && moonVisible ? (
              <Moon
                x={w - disc * 0.3}
                y={head.top + head.height * 0.25}
                size={disc}
                opacity={sky.moon * moonVisible}
                animate={!reduce}
              />
            ) : null}
            {clouds.map((c, i) => (
              <Cloud
                key={i}
                color={cloudColor!}
                top={cloudTop[c.at]}
                width={w * c.width}
                duration={c.duration}
                offset={c.offset}
                sceneWidth={w}
                animate={!reduce}
                density={density}
              />
            ))}
            {look.haze ? <View style={[abs, styles.haze]} /> : null}
            {look.precip && h
              ? PRECIP[look.precip].map((spec, i) => (
                  <PrecipLayer
                    key={`${look.precip}-${i}`}
                    spec={spec}
                    w={w}
                    h={h}
                    animate={!reduce}
                  />
                ))
              : null}
            {look.lightning && !reduce ? <Lightning /> : null}
            {sky.birds && look.birds && !reduce ? (
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
  sun: { position: 'absolute' },
  sunDisc: { position: 'absolute' },
  // The Five Skies design's sun: a soft-lit disc with a wide warm glow.
  sunBright: {
    backgroundImage:
      'radial-gradient(circle at 38% 38%, #FFFDF2 0%, #FFE9B4 55%, #FFCF86 100%)',
    boxShadow: '0px 0px 90px 30px rgba(255,226,150,0.42)',
  },
  sunWarm: {
    backgroundImage:
      'radial-gradient(circle at 38% 38%, #FFF1DE 0%, #FFC58A 55%, #F4A26B 100%)',
    boxShadow: '0px 0px 90px 30px rgba(255,197,138,0.42)',
  },
  moon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonGlow: {
    backgroundImage:
      'radial-gradient(circle, rgba(255,197,138,0.26) 0%, rgba(255,197,138,0.08) 40%, rgba(255,197,138,0) 70%)',
  },
  // The unlit part of the moon, just visible against the night sky.
  moonBody: {
    position: 'absolute',
    backgroundColor: 'rgba(255,236,206,0.07)',
  },
  cloud: { position: 'absolute', left: 0 },
  puff: { position: 'absolute' },
  flock: { position: 'absolute', left: 0, width: 1, height: 1 },
  bird: { position: 'absolute' },
  wingPivot: { position: 'absolute', left: 0, height: 1.6 },
  wing: { position: 'absolute', top: 0, height: 1.6, borderRadius: 1 },
  wingLeft: { left: 0 },
  precip: { position: 'absolute', left: 0, right: 0 },
  drop: { position: 'absolute' },
  flash: { backgroundColor: '#E8ECFF' },
  haze: {
    backgroundImage:
      'linear-gradient(180deg, rgba(236,236,244,0.04) 0%, rgba(236,236,244,0.2) 55%, rgba(236,236,244,0.26) 100%)',
  },
  meteor: {
    position: 'absolute',
    width: 80,
    height: 1.6,
    borderRadius: 1,
    backgroundImage:
      'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)',
  },
});
