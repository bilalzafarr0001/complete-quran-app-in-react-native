import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Crescent, SpinningStar } from '../components/Decor';
import { Star8 } from '../components/Star8';
import { onHero } from '../theme';

const GOLD = '#FFC58A';
const SILHOUETTE = 'rgba(255,226,196,0.92)';

function useLoop(duration: number, bounce = true) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ease = Easing.inOut(Easing.sin);
    const anim = bounce
      ? Animated.sequence([
          Animated.timing(t, {
            toValue: 1,
            duration,
            easing: ease,
            useNativeDriver: true,
          }),
          Animated.timing(t, {
            toValue: 0,
            duration,
            easing: ease,
            useNativeDriver: true,
          }),
        ])
      : Animated.timing(t, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        });
    const loop = Animated.loop(anim);
    loop.start();
    return () => loop.stop();
  }, [t, duration, bounce]);
  return t;
}

/** Slide 1 — glowing crescent with orbiting stars. */
export function CrescentArt() {
  const float = useLoop(2200);
  const orbit = useLoop(14000, false);
  const rotate = orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.glow,
          { boxShadow: '0px 0px 90px 30px rgba(255,197,138,0.25)' },
        ]}
      />
      <Animated.View style={[styles.abs, { transform: [{ rotate }] }]}>
        <View style={styles.orbit}>
          <Star8 size={18} color={GOLD} style={styles.orbitStar1} />
          <Star8 size={12} color={GOLD} style={styles.orbitStar2} />
          <Star8
            size={14}
            color="rgba(255,255,255,0.8)"
            style={styles.orbitStar3}
          />
        </View>
      </Animated.View>
      <Animated.View
        style={{
          transform: [
            {
              translateY: float.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 8],
              }),
            },
            { rotate: '-20deg' },
          ],
        }}
      >
        <Crescent
          size={150}
          color={GOLD}
          glow="0px 0px 40px rgba(255,197,138,0.6)"
        />
      </Animated.View>
    </View>
  );
}

/** Slide 2 — "Iqra" inside a rotating geometric rosette. */
export function QuranArt() {
  const pulse = useLoop(1800);
  return (
    <View style={styles.stage}>
      <SpinningStar
        size={250}
        color="rgba(255,197,138,0.55)"
        duration={30000}
      />
      <Animated.View
        style={[
          styles.abs,
          {
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1.06],
                }),
              },
            ],
          },
        ]}
      >
        <Star8
          size={150}
          color="rgba(255,255,255,0.10)"
          outline
          borderWidth={2}
          fill="rgba(58,22,48,0.6)"
        >
          <Text style={styles.iqra}>اقْرَأْ</Text>
        </Star8>
      </Animated.View>
    </View>
  );
}

/** Slide 3 — mosque silhouette with the sun travelling across the sky. */
export function PrayerArt() {
  const sun = useLoop(5000, false);
  const R = 120;
  const steps = Array.from({ length: 21 }, (_, i) => i / 20);
  const translateX = sun.interpolate({
    inputRange: steps,
    outputRange: steps.map(p => -R * Math.cos(Math.PI * p)),
  });
  const translateY = sun.interpolate({
    inputRange: steps,
    outputRange: steps.map(p => -R * Math.sin(Math.PI * p)),
  });
  const opacity = sun.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.arc,
          {
            width: R * 2,
            height: R,
            borderTopLeftRadius: R,
            borderTopRightRadius: R,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.sunWrap,
          { opacity, transform: [{ translateX }, { translateY }] },
        ]}
      >
        <View
          style={[
            styles.sun,
            { boxShadow: '0px 0px 24px 6px rgba(255,214,102,0.7)' },
          ]}
        />
      </Animated.View>

      {/* Mosque */}
      <View style={styles.mosque}>
        <View style={styles.minaretLeft}>
          <View style={styles.minaretTop} />
          <View style={styles.minaretBody} />
        </View>
        <View style={styles.center}>
          <View style={styles.domeCrescent}>
            <Crescent size={16} color={SILHOUETTE} />
          </View>
          <View style={styles.dome} />
          <View style={styles.base}>
            <View style={styles.door} />
          </View>
        </View>
        <View style={styles.minaretRight}>
          <View style={styles.minaretTop} />
          <View style={styles.minaretBody} />
        </View>
      </View>
      <View style={styles.ground} />
    </View>
  );
}

/** Slide 4 — rotating tasbeeh ring with a travelling highlight. */
export function DhikrArt() {
  const spin = useLoop(20000, false);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const R = 105;
  return (
    <View style={styles.stage}>
      <Animated.View
        style={[
          styles.ring,
          { width: R * 2 + 20, height: R * 2 + 20, transform: [{ rotate }] },
        ]}
      >
        {Array.from({ length: 33 }, (_, i) => {
          const a = (i / 33) * Math.PI * 2;
          const big = i === 0;
          const size = big ? 20 : 11;
          return (
            <View
              key={i}
              style={[
                styles.bead,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  left: R + 10 + Math.cos(a) * R - size / 2,
                  top: R + 10 + Math.sin(a) * R - size / 2,
                  backgroundColor: big
                    ? GOLD
                    : i < 12
                    ? 'rgba(255,197,138,0.9)'
                    : 'rgba(255,255,255,0.35)',
                },
              ]}
            />
          );
        })}
      </Animated.View>
      <Text style={styles.subhan}>سُبْحَانَ اللَّهِ</Text>
      <Text style={styles.subhanCount}>33</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abs: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  orbit: { width: 240, height: 240 },
  orbitStar1: { position: 'absolute', top: 0, left: 110 },
  orbitStar2: { position: 'absolute', bottom: 30, left: 20 },
  orbitStar3: { position: 'absolute', top: 120, right: 0 },
  iqra: {
    color: GOLD,
    fontSize: 56,
    textShadowColor: 'rgba(255,197,138,0.7)',
    textShadowRadius: 18,
  },
  arc: {
    position: 'absolute',
    top: 40,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,197,138,0.4)',
  },
  sunWrap: { position: 'absolute', top: 40 + 120 - 15, left: 140 - 15 },
  sun: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFD666' },
  mosque: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  center: { alignItems: 'center', marginHorizontal: 6 },
  domeCrescent: { marginBottom: 2 },
  dome: {
    width: 96,
    height: 60,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    backgroundColor: SILHOUETTE,
  },
  base: {
    width: 130,
    height: 56,
    backgroundColor: SILHOUETTE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  door: {
    width: 30,
    height: 36,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    backgroundColor: '#8E3457',
  },
  minaretLeft: { alignItems: 'center' },
  minaretRight: { alignItems: 'center' },
  minaretTop: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: SILHOUETTE,
  },
  minaretBody: { width: 16, height: 130, backgroundColor: SILHOUETTE },
  ground: {
    position: 'absolute',
    bottom: 38,
    width: 260,
    height: 2,
    backgroundColor: onHero.border,
  },
  ring: { position: 'absolute' },
  bead: { position: 'absolute' },
  subhan: { color: GOLD, fontSize: 28 },
  subhanCount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4,
  },
});
