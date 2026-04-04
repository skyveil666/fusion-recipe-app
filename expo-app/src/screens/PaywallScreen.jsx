import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Purchases from 'react-native-purchases';
import { useApp, useTheme } from '../AppContext';
import { RC_ENTITLEMENT } from '../constants';

export default function PaywallScreen({ navigation }) {
  const {
    remaining, bonusRecipes, isPremium,
    monthlyUsed, monthlyLimit,
    addBonusRecipes, setIsPremium,
  } = useApp();
  const C    = useTheme();
  const insets = useSafeAreaInsets();
  const s    = useMemo(() => makeStyles(C), [C]);

  const handleSubscribe = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.monthly;
      if (!pkg) {
        Alert.alert('エラー', '商品情報を取得できませんでした。しばらく経ってから再試行してください。');
        return;
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[RC_ENTITLEMENT]) {
        await setIsPremium(true);
        Alert.alert('加入しました！', '月20回まで生成できます。');
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('エラー', e.message ?? '購入に失敗しました');
      }
    }
  };

  const handleAddBonus = async (n, packageId) => {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(p => p.identifier === packageId);
      if (!pkg) {
        Alert.alert('エラー', '商品情報を取得できませんでした。しばらく経ってから再試行してください。');
        return;
      }
      await Purchases.purchasePackage(pkg);
      await addBonusRecipes(n);
      Alert.alert('追加しました！', `${n}回分が使えます。`);
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('エラー', e.message ?? '購入に失敗しました');
      }
    }
  };

  const handleRestore = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active[RC_ENTITLEMENT]) {
        await setIsPremium(true);
        Alert.alert('復元しました', 'スタンダードプランが復元されました。');
      } else {
        Alert.alert('復元完了', '有効な購入が見つかりませんでした。');
      }
    } catch (e) {
      Alert.alert('エラー', e.message ?? '復元に失敗しました');
    }
  };

  const usageRatio = monthlyLimit > 0 ? monthlyUsed / monthlyLimit : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
      <View style={[s.screen, { marginTop: insets.top }]}>

        {/* ヘッダー */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>‹ 戻る</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>プラン・ポイント管理</Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* 現在の使用状況カード */}
          <View style={s.usageCard}>
            <Text style={s.usageTitle}>📊 今月の使用状況</Text>
            <View style={s.usageRow}>
              <View style={s.usageStat}>
                <Text style={[s.usageNum, remaining === 0 && { color: '#dc2626' }]}>
                  {remaining}
                </Text>
                <Text style={s.usageLabel}>今月の残り</Text>
              </View>
              <View style={s.usageDivider} />
              <View style={s.usageStat}>
                <Text style={[s.usageNum, { color: '#7c3aed' }]}>{bonusRecipes}</Text>
                <Text style={s.usageLabel}>追加の残り</Text>
              </View>
              <View style={s.usageDivider} />
              <View style={s.usageStat}>
                <Text style={[s.usageNum, { color: '#888' }]}>{monthlyUsed}</Text>
                <Text style={s.usageLabel}>今月の利用済み</Text>
              </View>
            </View>

            {/* プログレスバー */}
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${Math.min(usageRatio * 100, 100)}%` }]} />
            </View>
            <Text style={s.progressLabel}>
              {isPremium ? 'スタンダード' : '無料プラン'}　月{monthlyLimit}回まで
            </Text>
          </View>

          {/* タイトル */}
          <Text style={s.mainTitle}>もっとレシピを楽しもう</Text>
          <Text style={s.mainSub}>
            無料でも気軽に使えて、{'\n'}たくさん使いたい方はお得に続けられます。
          </Text>

          {/* ── 無料プラン ── */}
          <View style={[s.planCard, !isPremium && s.planCardCurrent]}>
            <View style={s.planTop}>
              <Text style={s.planName}>無料プラン</Text>
              {!isPremium && (
                <View style={s.currentBadge}>
                  <Text style={s.currentBadgeText}>現在のプラン</Text>
                </View>
              )}
            </View>
            <Text style={s.planPrice}>¥0</Text>
            <View style={s.featureList}>
              <Text style={s.feature}>✓ 月5回までレシピ生成</Text>
            </View>
            <Text style={s.planNote}>まずはお試しで使いたい方におすすめ</Text>
            {!isPremium && (
              <TouchableOpacity
                style={s.outlineBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Text style={s.outlineBtnText}>無料で始める</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── スタンダード（おすすめ）── */}
          <View style={[s.planCard, s.planCardStar]}>
            <View style={s.recommendBadge}>
              <Text style={s.recommendBadgeText}>⭐ いちばんおすすめ</Text>
            </View>
            <View style={s.planTop}>
              <Text style={[s.planName, { color: '#3a5a18' }]}>スタンダード</Text>
              {isPremium && (
                <View style={[s.currentBadge, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                  <Text style={[s.currentBadgeText, { color: '#3a5a18' }]}>ご利用中</Text>
                </View>
              )}
            </View>
            <View style={s.priceRow}>
              <Text style={[s.planPrice, { color: '#3a5a18' }]}>¥500</Text>
              <Text style={s.planPricePer}> / 月</Text>
            </View>
            <Text style={s.planHighlight}>
              月20回まで使えて、いちばんバランスの良いプランです
            </Text>
            <View style={s.featureList}>
              <Text style={s.feature}>✓ 月20回までレシピ生成</Text>
              <Text style={s.feature}>✓ 広告なし</Text>
              <Text style={s.feature}>✓ 履歴・お気に入り無制限</Text>
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, isPremium && s.primaryBtnActive]}
              onPress={isPremium ? undefined : handleSubscribe}
              activeOpacity={isPremium ? 1 : 0.85}
            >
              <Text style={s.primaryBtnText}>
                {isPremium ? '✓ ご利用中' : 'スタンダードではじめる'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── 追加購入 ── */}
          <View style={s.addCard}>
            <Text style={s.addTitle}>➕ 回数を追加購入</Text>
            <Text style={s.addSub}>追加購入分はすぐに使えます</Text>

            {/* 10回追加 */}
            <TouchableOpacity
              style={s.addRow}
              onPress={() => handleAddBonus(10, 'bonus_10')}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.addRowTitle}>10回追加する</Text>
                <Text style={s.addRowSub}>すぐに使えます</Text>
              </View>
              <Text style={s.addRowPrice}>¥380</Text>
            </TouchableOpacity>

            {/* 20回追加 */}
            <TouchableOpacity
              style={[s.addRow, { borderColor: '#7c3aed', backgroundColor: '#faf5ff' }]}
              onPress={() => handleAddBonus(20, 'bonus_20')}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.addRowTitle, { color: '#7c3aed' }]}>20回追加する</Text>
                <Text style={s.addRowSub}>まとめて買うとお得</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.addRowPrice, { color: '#7c3aed' }]}>¥750</Text>
                <View style={s.savePill}>
                  <Text style={s.savePillText}>10円おトク</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* 補足 */}
          <View style={s.noteCard}>
            <Text style={s.noteText}>ℹ️ 回数は毎月自動でリセットされます</Text>
            <Text style={s.noteText}>ℹ️ 追加購入分はすぐに使えます</Text>
          </View>

          {/* リストア・管理 */}
          <TouchableOpacity style={s.textBtn} onPress={handleRestore}>
            <Text style={s.textBtnText}>購入を復元する</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.textBtn}
            onPress={() =>
              Linking.openURL('https://play.google.com/store/account/subscriptions')
            }
          >
            <Text style={s.textBtnText}>サブスクを管理する（Google Play）</Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder,
  },
  backBtn: {},
  backText: { fontSize: 14, fontWeight: '600', color: '#3a5a18', minWidth: 52 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  scroll: { padding: 16, gap: 14 },

  // 使用状況
  usageCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  usageTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 14 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
  usageStat: { alignItems: 'center', gap: 4 },
  usageNum: { fontSize: 28, fontWeight: '900', color: '#3a5a18' },
  usageLabel: { fontSize: 11, color: C.textMuted, textAlign: 'center' },
  usageDivider: { width: 1, backgroundColor: C.creamBorder, alignSelf: 'stretch' },
  progressBg: {
    height: 8, borderRadius: 4, backgroundColor: C.creamBorder, marginBottom: 6,
  },
  progressFill: {
    height: 8, borderRadius: 4, backgroundColor: '#3a5a18',
  },
  progressLabel: { fontSize: 11, color: C.textMuted, textAlign: 'right' },

  // タイトル
  mainTitle: {
    fontSize: 22, fontWeight: '900', color: C.text, textAlign: 'center',
  },
  mainSub: {
    fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 22,
  },

  // プランカード共通
  planCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    borderWidth: 2, borderColor: C.creamBorder,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    gap: 8,
  },
  planCardCurrent: { borderColor: '#d1d5db' },
  planCardStar: {
    borderColor: '#3a5a18',
    shadowColor: '#3a5a18', shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  recommendBadge: {
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 4,
  },
  recommendBadgeText: { fontSize: 12, fontWeight: '700', color: '#3a5a18' },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 17, fontWeight: '800', color: C.text },
  currentBadge: {
    backgroundColor: '#f3f4f6', borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  currentBadgeText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: 30, fontWeight: '900', color: C.text },
  planPricePer: { fontSize: 13, color: C.textMuted },
  planHighlight: { fontSize: 13, color: '#3a5a18', fontWeight: '600', lineHeight: 19 },
  featureList: { gap: 5 },
  feature: { fontSize: 14, color: C.text },
  planNote: { fontSize: 12, color: C.textMuted, lineHeight: 18 },

  // ボタン
  primaryBtn: {
    backgroundColor: '#3a5a18', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  primaryBtnActive: { backgroundColor: '#86d65a' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  outlineBtn: {
    borderWidth: 2, borderColor: '#d1d5db', borderRadius: 14,
    paddingVertical: 12, alignItems: 'center', marginTop: 4,
  },
  outlineBtnText: { fontSize: 14, color: C.textSub, fontWeight: '600' },

  // 追加購入
  addCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    gap: 10,
  },
  addTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  addSub: { fontSize: 12, color: C.textMuted, marginTop: -4 },
  addRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.creamBorder,
    borderRadius: 14, padding: 14,
    backgroundColor: C.cream,
  },
  addRowTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  addRowSub: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  addRowPrice: { fontSize: 18, fontWeight: '900', color: C.text },
  savePill: {
    backgroundColor: '#f3e8ff', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 3,
  },
  savePillText: { fontSize: 10, color: '#7c3aed', fontWeight: '600' },

  // 補足
  noteCard: {
    backgroundColor: `${C.primary}15`, borderRadius: 14, padding: 14,
    gap: 6, borderWidth: 1, borderColor: `${C.primary}30`,
  },
  noteText: { fontSize: 12, color: C.primary, lineHeight: 18 },

  // テキストボタン
  textBtn: { alignItems: 'center', paddingVertical: 10 },
  textBtnText: { fontSize: 13, color: C.textMuted, textDecorationLine: 'underline' },
});
