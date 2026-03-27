import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList,
  StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import { pickFoodImage } from '../constants';

export default function FavoritesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { favorites, setFavorites, setRecipeResult } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  const remove = (name) => {
    Alert.alert('削除確認', `「${name}」をお気に入りから削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => setFavorites((p) => p.filter((f) => f.name !== name)) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
    <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>❤️ お気に入り</Text>
        <Text style={s.headerSub}>{favorites.length} 件のレシピ</Text>
      </View>

      {favorites.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 48 }}>🤍</Text>
          <Text style={s.emptyText}>
            {'まだお気に入りがありません\nレシピを生成して追加しましょう'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.name + item.savedAt}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Image source={{ uri: item.savedImage || pickFoodImage(item.name) }} style={s.thumb} />
              <View style={s.info}>
                <Text style={s.recipeName} numberOfLines={2}>{item.name}</Text>
                <View style={s.meta}>
                  {item.time     && <Text style={s.metaText}>⏱ {item.time}</Text>}
                  {item.calories && <Text style={s.metaText}>🔥 {item.calories} kcal</Text>}
                </View>
                <View style={s.actions}>
                  <TouchableOpacity
                    style={s.viewBtn}
                    onPress={() => { setRecipeResult(item); navigation.navigate('Result'); }}
                  >
                    <Text style={s.viewBtnText}>レシピを見る</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.deleteBtn} onPress={() => remove(item.name)}>
                    <Text style={{ fontSize: 16 }}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: C.white, borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 8, elevation: 2,
  },
  thumb: { width: 100, height: 100 },
  info: { flex: 1, padding: 12, justifyContent: 'space-between' },
  recipeName: { fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 20 },
  meta: { flexDirection: 'row', gap: 10 },
  metaText: { fontSize: 11, color: C.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: C.primary,
  },
  viewBtnText: { fontSize: 12, fontWeight: '600', color: C.primary },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
});
