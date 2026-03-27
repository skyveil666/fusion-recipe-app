import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import BottomNav from '../components/BottomNav';

const SUB_MODES = [
  {
    id: 'single',
    emoji: '📍',
    title: 'シングルレシピ',
    subtitle: '一つの地域の\n料理を楽しむ',
    bgColor: '#e3edf9',
    accentColor: '#1a4a80',
    screen: 'SingleRecipe',
  },
  {
    id: 'seasonal',
    emoji: '🌱',
    title: '旬の食材',
    subtitle: '季節の食材で\n作るレシピ',
    bgColor: '#fef3e2',
    accentColor: '#a05c00',
    screen: 'Seasonal',
  },
  {
    id: 'pfc',
    emoji: '⚖️',
    title: '栄養目標',
    subtitle: '栄養バランスを\n意識して作る',
    bgColor: '#f3e8fb',
    accentColor: '#6a1a8a',
    screen: 'PFCRecipe',
  },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { hasSeenOnboarding } = useApp();

  useEffect(() => {
    if (!hasSeenOnboarding) {
      navigation.replace('Onboarding');
    }
  }, [hasSeenOnboarding]);

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerSub}>AI World Cooking</Text>
          <Text style={s.headerTitle}>Fusion Recipe</Text>
          <Text style={s.headerDesc}>気になるスタイルを選んでください</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Featured: Fusion Card */}
          <TouchableOpacity
            style={s.featuredCard}
            onPress={() => navigation.navigate('FusionSelect')}
            activeOpacity={0.85}
          >
            <View style={s.featuredLeft}>
              <Text style={s.featuredEmoji}>🌍</Text>
              <View>
                <Text style={s.featuredBadge}>メイン機能</Text>
                <Text style={s.featuredTitle}>フュージョンレシピ</Text>
                <Text style={s.featuredSub}>
                  2つの地域の料理を組み合わせた{'\n'}世界にひとつのオリジナルレシピ
                </Text>
              </View>
            </View>
            <View style={s.featuredArrow}>
              <Text style={s.featuredArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Featured: Photo Recipe Card */}
          <TouchableOpacity
            style={s.photoCard}
            onPress={() => navigation.navigate('PhotoRecipe')}
            activeOpacity={0.85}
          >
            <View style={s.featuredLeft}>
              <Text style={s.featuredEmoji}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.photoBadge}>かんたん一品</Text>
                <Text style={s.photoTitle}>写真でかんたん一品</Text>
                <Text style={s.photoSub}>
                  写真を撮るだけで15分以内に{'\n'}作れる一品をすぐ提案
                </Text>
              </View>
            </View>
            <View style={s.photoArrow}>
              <Text style={s.featuredArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Featured: Dish Fusion Card */}
          <TouchableOpacity
            style={s.dishCard}
            onPress={() => navigation.navigate('DishFusion')}
            activeOpacity={0.85}
          >
            <View style={s.featuredLeft}>
              <Text style={s.featuredEmoji}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.dishBadge}>時短アレンジ</Text>
                <Text style={s.dishTitle}>料理×食材フュージョン</Text>
                <Text style={s.dishSub}>
                  好きな料理に食材を掛け合わせて{'\n'}家で作れる新しい一皿に
                </Text>
              </View>
            </View>
            <View style={s.dishArrow}>
              <Text style={s.featuredArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Sub Mode Cards: 3-column */}
          <Text style={s.sectionLabel}>その他のスタイル</Text>
          <View style={s.subGrid}>
            {SUB_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[s.subCard, { backgroundColor: mode.bgColor }]}
                onPress={() => navigation.navigate(mode.screen)}
                activeOpacity={0.85}
              >
                <Text style={s.subEmoji}>{mode.emoji}</Text>
                <Text style={[s.subTitle, { color: mode.accentColor }]}>{mode.title}</Text>
                <Text style={[s.subSub, { color: mode.accentColor + 'aa' }]}>{mode.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        <BottomNav navigation={navigation} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f2e6' },

  // Header
  header: {
    backgroundColor: '#2d5a1b',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 28,
    alignItems: 'center',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    letterSpacing: 2.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  headerDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
  },

  scroll: { padding: 16, paddingTop: 20 },

  // Featured Fusion Card
  featuredCard: {
    backgroundColor: '#e8f5e2',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2d5a1b',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#b8d9a0',
  },
  featuredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  featuredEmoji: { fontSize: 52 },
  featuredBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#3a5a18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 5,
    overflow: 'hidden',
  },
  featuredTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2d5a1b',
    marginBottom: 5,
  },
  featuredSub: {
    fontSize: 12,
    color: '#4a7a30',
    lineHeight: 18,
  },
  featuredArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3a5a18',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  featuredArrowText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Dish Fusion Card
  dishCard: {
    backgroundColor: '#f5f0ff',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#ddd6fe',
  },
  dishBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 5,
    overflow: 'hidden',
  },
  dishTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3b1f6e',
    marginBottom: 4,
  },
  dishSub: {
    fontSize: 12,
    color: '#7c3aed',
    lineHeight: 17,
  },
  dishArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Photo Recipe Card
  photoCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#b45309',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  photoBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    backgroundColor: '#b45309',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 5,
    overflow: 'hidden',
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  photoSub: {
    fontSize: 12,
    color: '#b45309',
    lineHeight: 17,
  },
  photoArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#b45309',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Section label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    letterSpacing: 1,
  },

  // Sub cards (3-column)
  subGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  subCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  subEmoji: { fontSize: 30, marginBottom: 8 },
  subTitle: { fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subSub: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
