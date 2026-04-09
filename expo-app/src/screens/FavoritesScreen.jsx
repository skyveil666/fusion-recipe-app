import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import { pickFoodImage } from '../constants';

const SOURCE_LABELS = {
  fusion:    { label: 'フュージョン', emoji: '🌍', color: '#2d5a1b' },
  single:    { label: 'シングル',     emoji: '📍', color: '#1a4a80' },
  seasonal:  { label: '旬の食材',     emoji: '🌱', color: '#166534' },
  pfc:       { label: '栄養目標',     emoji: '⚖️', color: '#6a1a8a' },
  photo:     { label: '写真から',     emoji: '📷', color: '#b45309' },
  dish:      { label: '料理×食材',   emoji: '🧪', color: '#7c3aed' },
  leftover:  { label: '残り物',       emoji: '♻️', color: '#0f766e' },
  microwave: { label: '電子レンジ',   emoji: '⚡', color: '#d97706' },
  unknown:   { label: 'その他',       emoji: '🍽', color: '#888' },
};

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { savedRecipes, setRecipeResult, toggleFavorite } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  const favorites = useMemo(() => savedRecipes.filter(r => r.favorite), [savedRecipes]);

  const openRecipe = (item) => {
    setRecipeResult(item);
    navigation.navigate('Result');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* ヘッダー */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>❤️ お気に入り</Text>
            <Text style={s.headerSub}>{favorites.length} 件のレシピ</Text>
          </View>
        </View>

        {favorites.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 52 }}>🤍</Text>
            <Text style={s.emptyTitle}>お気に入りがありません</Text>
            <Text style={s.emptyText}>
              {'レシピを開いて♡をタップすると\nお気に入りに登録されます'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id || item.name}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const src = SOURCE_LABELS[item.source] || SOURCE_LABELS.unknown;
              return (
                <TouchableOpacity style={s.card} onPress={() => openRecipe(item)} activeOpacity={0.87}>
                  <Image
                    source={{ uri: item.savedImage || pickFoodImage(item.name) }}
                    style={s.thumb}
                  />
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <View style={[s.sourceBadge, { backgroundColor: src.color + '18', borderColor: src.color + '44' }]}>
                        <Text style={[s.sourceBadgeText, { color: src.color }]}>{src.emoji} {src.label}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(item.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Text style={s.favHeart}>❤️</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.cardTitle} numberOfLines={2}>{item.name}</Text>
                    <View style={s.cardMeta}>
                      {item.time && <Text style={s.metaText}>⏱ {item.time}</Text>}
                      {item.calories && <Text style={s.metaText}>🔥 {item.calories}kcal</Text>}
                    </View>
                    {item.memo ? (
                      <Text style={s.memoPreview} numberOfLines={1}>📝 {item.memo}</Text>
                    ) : null}
                    <Text style={s.dateText}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                    </Text>
                  </View>
                  <Text style={s.arrow}>›</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        <BottomNav navigation={navigation} />
      </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  header: {
    backgroundColor: '#2d5a1b',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },

  list: { padding: 14, gap: 12, paddingBottom: 90 },

  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  thumb: { width: 100, height: 110 },
  cardBody: { flex: 1, padding: 12, gap: 5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '700' },
  favHeart: { fontSize: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.text, lineHeight: 22 },
  cardMeta: { flexDirection: 'row', gap: 10 },
  metaText: { fontSize: 12, color: C.textMuted },
  memoPreview: { fontSize: 12, color: '#a16207', lineHeight: 17 },
  dateText: { fontSize: 11, color: C.textMuted },
  arrow: { fontSize: 24, color: C.textMuted, paddingRight: 14, alignSelf: 'center' },
});
