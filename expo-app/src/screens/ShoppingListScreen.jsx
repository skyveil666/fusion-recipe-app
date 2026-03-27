import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';

export default function ShoppingListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const {
    shoppingList,
    toggleShoppingItem,
    removeShoppingItem,
    clearBoughtItems,
    clearAllShoppingItems,
  } = useApp();

  const [showBought, setShowBought] = useState(true);

  const unpurchased = shoppingList.filter((i) => !i.bought);
  const purchased   = shoppingList.filter((i) => i.bought);

  const handleClearBought = () => {
    if (purchased.length === 0) return;
    Alert.alert('購入済みを削除', `購入済み ${purchased.length} 件を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: clearBoughtItems },
    ]);
  };

  const handleClearAll = () => {
    if (shoppingList.length === 0) return;
    Alert.alert('全件削除', 'リストをすべて削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: clearAllShoppingItems },
    ]);
  };

  const renderItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[s.itemRow, item.bought && s.itemRowBought]}
      onPress={() => toggleShoppingItem(item.id)}
      activeOpacity={0.7}
    >
      <View style={[s.checkCircle, item.bought && s.checkCircleActive]}>
        {item.bought && <Text style={s.checkMark}>✓</Text>}
      </View>
      <View style={s.itemInfo}>
        <Text style={[s.itemName, item.bought && s.itemNameBought]}>{item.name}</Text>
        <View style={s.itemMeta}>
          {item.amount ? <Text style={s.itemAmount}>{item.amount}</Text> : null}
          {item.recipeName ? (
            <Text style={s.itemRecipe}>📋 {item.recipeName}</Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => removeShoppingItem(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={s.deleteBtnText}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>🛒 買い物リスト</Text>
            <Text style={s.headerSub}>
              {unpurchased.length > 0
                ? `未購入 ${unpurchased.length} 件${purchased.length > 0 ? ` / 購入済み ${purchased.length} 件` : ''}`
                : purchased.length > 0
                  ? `すべて購入済み (${purchased.length} 件)`
                  : 'リストは空です'}
            </Text>
          </View>
          {shoppingList.length > 0 && (
            <View style={s.headerActions}>
              {purchased.length > 0 && (
                <TouchableOpacity style={s.clearBoughtBtn} onPress={handleClearBought} activeOpacity={0.8}>
                  <Text style={s.clearBoughtText}>購入済みを削除</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.clearAllBtn} onPress={handleClearAll} activeOpacity={0.8}>
                <Text style={s.clearAllText}>全削除</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {shoppingList.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🛒</Text>
              <Text style={s.emptyTitle}>リストは空です</Text>
              <Text style={s.emptyDesc}>
                レシピ詳細画面の材料セクションから{'\n'}買い物リストに追加できます
              </Text>
            </View>
          ) : (
            <>
              {/* 未購入 */}
              {unpurchased.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>未購入 ({unpurchased.length})</Text>
                  {unpurchased.map(renderItem)}
                </View>
              )}

              {/* 購入済み */}
              {purchased.length > 0 && (
                <View style={s.section}>
                  <TouchableOpacity
                    style={s.sectionToggleRow}
                    onPress={() => setShowBought(!showBought)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.sectionLabelBought}>購入済み ({purchased.length})</Text>
                    <Text style={s.sectionToggleIcon}>{showBought ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showBought && purchased.map(renderItem)}
                </View>
              )}
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <BottomNav navigation={navigation} />
      </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },

  header: {
    backgroundColor: C.cream,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.creamBorder,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 },
  clearBoughtBtn: {
    backgroundColor: C.cream,
    borderRadius: 10, borderWidth: 1, borderColor: C.creamBorder,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  clearBoughtText: { fontSize: 11, color: C.textSub, fontWeight: '600' },
  clearAllBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  clearAllText: { fontSize: 11, color: '#dc2626', fontWeight: '700' },

  scroll: { padding: 16, gap: 8 },

  emptyBox: {
    alignItems: 'center', paddingVertical: 60, gap: 12,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyDesc: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 20 },

  section: {
    backgroundColor: C.white, borderRadius: 16,
    padding: 12, marginBottom: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.primary,
    letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4,
  },
  sectionToggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8, paddingLeft: 4,
  },
  sectionLabelBought: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
  sectionToggleIcon: { fontSize: 11, color: C.textMuted },

  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder,
  },
  itemRowBought: { opacity: 0.5 },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.white, flexShrink: 0,
  },
  checkCircleActive: { backgroundColor: C.primary, borderColor: C.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, color: C.text, fontWeight: '500' },
  itemNameBought: { textDecorationLine: 'line-through', color: C.textMuted },
  itemMeta: { flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' },
  itemAmount: { fontSize: 12, color: C.textMuted },
  itemRecipe: { fontSize: 11, color: C.textMuted },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 16, color: '#dc2626', lineHeight: 20 },
});
