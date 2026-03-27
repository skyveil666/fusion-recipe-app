import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList,
  StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import { pickFoodImage } from '../constants';

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { history, setHistory, setRecipeResult } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);

  const clearAll = () => {
    Alert.alert('履歴を削除', '全ての履歴を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => setHistory([]) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
    <View style={[s.outerScreen, { marginTop: insets.top }]}>
      <View style={s.screen}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>🕐 履歴</Text>
            <Text style={s.headerSub}>{history.length} 件 / 最大20件</Text>
          </View>
          {history.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={s.clearBtn}>
              <Text style={s.clearText}>全削除</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>🕐</Text>
            <Text style={s.emptyText}>
              {'まだ履歴がありません\nレシピを生成すると履歴に追加されます'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item, i) => item.name + i}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.card}
                onPress={() => { setRecipeResult(item); navigation.navigate('Result'); }}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.savedImage || pickFoodImage(item.name) }} style={s.thumb} />
                <View style={s.info}>
                  <Text style={s.recipeName} numberOfLines={2}>{item.name}</Text>
                  <View style={s.meta}>
                    {item.time     && <Text style={s.metaText}>⏱ {item.time}</Text>}
                    {item.calories && <Text style={s.metaText}>🔥 {item.calories} kcal</Text>}
                  </View>
                  <Text style={s.date}>
                    {item.viewedAt ? new Date(item.viewedAt).toLocaleDateString('ja-JP') : ''}
                  </Text>
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            )}
          />
        )}

        <BottomNav navigation={navigation} />
      </View>
    </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  outerScreen: { flex: 1, backgroundColor: C.cream },
  screen: { flex: 1, backgroundColor: C.cream },
  header: {
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: C.red,
  },
  clearText: { fontSize: 12, color: C.red, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 80 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: C.white, borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  thumb: { width: 90, height: 90 },
  info: { flex: 1, padding: 12, gap: 4 },
  recipeName: { fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 20 },
  meta: { flexDirection: 'row', gap: 10 },
  metaText: { fontSize: 11, color: C.textMuted },
  date: { fontSize: 11, color: C.textMuted },
  arrow: { fontSize: 22, color: C.textMuted, paddingRight: 12 },
});
