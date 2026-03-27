import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

const STEPS = [
  { emoji: '✈️', msg: '世界の食材を探しています...' },
  { emoji: '🌍', msg: '地域の文化を分析中...' },
  { emoji: '👨‍🍳', msg: 'レシピを考案中...' },
  { emoji: '🧪', msg: '栄養バランスを計算中...' },
  { emoji: '✨', msg: '最終調整をしています...' },
];

function Dot({ delay }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.dot, { opacity: anim }]} />;
}

export default function LoadingOverlay({ visible }) {
  const [stepIdx, setStepIdx] = useState(0);
  const pulse  = useRef(new Animated.Value(1)).current;
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setStepIdx(0);
      pulse.stopAnimation();
      pulse.setValue(1);
      barAnim.stopAnimation();
      barAnim.setValue(0);
      return;
    }

    // Emoji pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    // Step cycling every 5 seconds
    setStepIdx(0);
    const interval = setInterval(() => {
      setStepIdx(prev => (prev + 1) % STEPS.length);
    }, 5000);

    // Progress bar grows to 90% over 28 seconds
    barAnim.setValue(0);
    Animated.timing(barAnim, {
      toValue: 0.9,
      duration: 28000,
      useNativeDriver: false,
    }).start();

    return () => {
      clearInterval(interval);
      pulseLoop.stop();
    };
  }, [visible]);

  const { emoji, msg } = STEPS[stepIdx];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <Animated.Text style={[s.emoji, { transform: [{ scale: pulse }] }]}>
            {emoji}
          </Animated.Text>
          <Text style={s.msg}>{msg}</Text>

          {/* Progress bar */}
          <View style={s.track}>
            <Animated.View
              style={[
                s.bar,
                {
                  width: barAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={s.dots}>
            <Dot delay={0} />
            <Dot delay={200} />
            <Dot delay={400} />
          </View>
          <Text style={s.hint}>最大30秒ほどかかります</Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    width: 280,
  },
  emoji: { fontSize: 56 },
  msg: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    minHeight: 22,
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  hint: { fontSize: 11, color: '#bbb', marginTop: 2 },
});
