import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import UsageIndicator from '../components/UsageIndicator';
import { API_BASE } from '../constants';

const TIME_OPTIONS     = ['5分', '10分'];
const SERVINGS_OPTIONS = ['1人前', '2人前', '3人前', '4人前'];

const ACCENT      = '#d97706';
const ACCENT_DARK = '#92400e';
const BG_LIGHT    = '#fffbeb';
const BORDER_COLOR = '#fcd34d';

export default function MicrowaveScreen({ navigation }) {
  const { canGenerate: canUseRecipe, useRecipe, setRecipeResult, setRecipeSource, setFusionParams, addToHistory } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [ingredientText, setIngredientText] = useState('');
  const [cookingTime, setCookingTime]       = useState('10分');
  const [servings, setServings]             = useState('1人前');
  const [lessSeasoning, setLessSeasoning]   = useState(false);
  const [homeIngredients, setHomeIngredients] = useState(true);
  const [lessWashing, setLessWashing]       = useState(false);
  const [cleanHands, setCleanHands]         = useState(false);
  const [isExcludeEnabled, setIsExcludeEnabled] = useState(false);
  const [excludeText, setExcludeText]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [showDetails, setShowDetails]       = useState(false);

  const canGenerate = ingredientText.trim().length > 0;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const generate = async () => {
    if (!canGenerate) {
      Alert.alert('入力が必要です', '食材を入力してください。');
      return;
    }
    if (!canUseRecipe) {
      Alert.alert(
        '今月の回数を使い切りました',
        'スタンダードプランに加入するか、\n回数を追加購入すると続けられます。',
        [
          { text: 'プランを見る', onPress: () => navigation.navigate('Paywall') },
          { text: 'キャンセル', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const excludeList = isExcludeEnabled && excludeText.trim()
        ? excludeText.split(/[,、\s]+/).map(s => s.trim()).filter(Boolean)
        : [];

      const params = {
        ingredientText: ingredientText.trim(),
        cookingTime,
        servings,
        lessSeasoning,
        homeIngredients,
        lessWashing,
        cleanHands,
        excludeList,
      };

      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'microwave', params }),
      });
      if (!res.ok) throw new Error(res.status === 500 ? 'server' : 'network');
      useRecipe();
      const data = await res.json();

      setRecipeResult(data.recipe);
      setRecipeSource('microwave');
      setFusionParams({ ingredientText: ingredientText.trim(), cookingTime, servings, type: 'microwave' });
      addToHistory(data.recipe, 'microwave');
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      if (e.message === 'network' || e.name === 'TypeError')
        Alert.alert('接続エラー', 'インターネット接続を確認してください。');
      else if (e.name === 'AbortError')
        Alert.alert('タイムアウト', '生成に時間がかかりすぎました。\nもう一度試してください。');
      else
        Alert.alert('エラー', 'レシピの生成に失敗しました。\nもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: ACCENT_DARK }}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backText}>← 戻る</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>⚡ 電子レンジで一品</Text>
          <Text style={s.headerDesc}>火を使わず、10分以内で簡単に</Text>
          {/* 安心バッジ */}
          <View style={s.trustBadgeRow}>
            <View style={s.trustBadge}><Text style={s.trustBadgeText}>🔥 火を使わない</Text></View>
            <View style={s.trustBadge}><Text style={s.trustBadgeText}>⏱ 10分以内</Text></View>
            <View style={s.trustBadge}><Text style={s.trustBadgeText}>🏠 家にある材料</Text></View>
            <View style={s.trustBadge}><Text style={s.trustBadgeText}>✨ 失敗しにくい</Text></View>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 食材入力 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>🥦 使いたい食材</Text>
            <Text style={s.cardNote}>冷蔵庫にある食材を入力してください（例: 豆腐、もやし、卵、鶏むね肉）</Text>
            <TextInput
              style={s.input}
              placeholder="例: 豆腐、卵、もやし、キャベツ..."
              placeholderTextColor="#aaa"
              value={ingredientText}
              onChangeText={setIngredientText}
              maxLength={60}
              multiline
            />
          </View>

          {/* 調理時間 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>⏱️ 調理時間</Text>
            <View style={s.chipRow}>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.chip, cookingTime === t && s.chipActive]}
                  onPress={() => setCookingTime(t)}
                >
                  <Text style={[s.chipText, cookingTime === t && s.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 人前 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>👥 人前</Text>
            <View style={s.chipRow}>
              {SERVINGS_OPTIONS.map(sv => (
                <TouchableOpacity
                  key={sv}
                  style={[s.chip, servings === sv && s.chipActive]}
                  onPress={() => setServings(sv)}
                >
                  <Text style={[s.chipText, servings === sv && s.chipTextActive]}>{sv}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* こだわり設定（折りたたみ） */}
          <TouchableOpacity
            style={s.detailsToggle}
            onPress={() => setShowDetails(!showDetails)}
            activeOpacity={0.8}
          >
            <View style={s.detailsToggleLeft}>
              <Text style={s.detailsToggleTitle}>⚙️ こだわり設定</Text>
              <Text style={s.detailsToggleHint}>任意 — 設定しなくても生成できます</Text>
            </View>
            <Text style={s.detailsToggleArrow}>{showDetails ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showDetails && (
            <View style={s.detailsContent}>
              {/* オプション */}
              <View style={s.card}>
                <Text style={s.cardLabel}>⚙️ 調理オプション</Text>

                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.switchLabel}>調味料少なめ</Text>
                    <Text style={s.switchDesc}>基本調味料だけで作ります</Text>
                  </View>
                  <Switch value={lessSeasoning} onValueChange={setLessSeasoning}
                    trackColor={{ false: '#ddd', true: ACCENT }} thumbColor="#fff" />
                </View>

                <View style={s.divider} />

                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.switchLabel}>家にあるもので作る</Text>
                    <Text style={s.switchDesc}>買い足しをできるだけ減らします</Text>
                  </View>
                  <Switch value={homeIngredients} onValueChange={setHomeIngredients}
                    trackColor={{ false: '#ddd', true: ACCENT }} thumbColor="#fff" />
                </View>

                <View style={s.divider} />

                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.switchLabel}>洗い物少なめ</Text>
                    <Text style={s.switchDesc}>洗い物を最小限にします</Text>
                  </View>
                  <Switch value={lessWashing} onValueChange={setLessWashing}
                    trackColor={{ false: '#ddd', true: ACCENT }} thumbColor="#fff" />
                </View>

                <View style={s.divider} />

                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.switchLabel}>手が汚れにくい</Text>
                    <Text style={s.switchDesc}>手が汚れずに作れます</Text>
                  </View>
                  <Switch value={cleanHands} onValueChange={setCleanHands}
                    trackColor={{ false: '#ddd', true: ACCENT }} thumbColor="#fff" />
                </View>
              </View>

              {/* 除外キーワード */}
              <View style={s.card}>
                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.cardLabel}>🚫 除外キーワード（任意）</Text>
                    <Text style={s.switchDesc}>含めてほしくない食材・料理を書いてください</Text>
                  </View>
                  <Switch value={isExcludeEnabled} onValueChange={setIsExcludeEnabled}
                    trackColor={{ false: '#ddd', true: ACCENT }} thumbColor="#fff" />
                </View>
                {isExcludeEnabled && (
                  <TextInput
                    style={[s.input, { marginTop: 12 }]}
                    placeholder="例: にんにく、辛いもの（カンマ区切り）"
                    placeholderTextColor="#aaa"
                    value={excludeText}
                    onChangeText={setExcludeText}
                  />
                )}
              </View>
            </View>
          )}

          {/* サマリー */}
          {canGenerate && (
            <View style={s.confirmSummary}>
              <Text style={s.confirmLabel}>📋 今の設定</Text>
              <Text style={s.confirmText}>
                {[ingredientText.trim(), cookingTime, servings].join('　/　')}
              </Text>
            </View>
          )}

          {/* 生成ボタン */}
          <TouchableOpacity
            style={[s.genBtn, !canGenerate && s.genBtnDisabled]}
            onPress={generate}
            activeOpacity={0.85}
          >
            <Text style={s.genBtnText}>⚡ レンジレシピを作る</Text>
          </TouchableOpacity>
          {!canGenerate && (
            <Text style={s.genHint}>食材を入力すると生成できます</Text>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <BottomNav navigation={navigation} />
        {loading && <LoadingOverlay message="レンジレシピを考えています..." />}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: BG_LIGHT },
    header: {
      backgroundColor: ACCENT_DARK,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 24,
    },
    backBtn: { marginBottom: 12 },
    backText: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 6 },
    headerDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    trustBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    trustBadge: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    trustBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },

    scroll: { padding: 16, paddingTop: 18 },

    card: {
      backgroundColor: '#fff',
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      shadowColor: ACCENT,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    cardLabel: { fontSize: 15, fontWeight: '800', color: ACCENT_DARK, marginBottom: 4 },
    cardNote: { fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 17 },

    input: {
      borderWidth: 1.5,
      borderColor: BORDER_COLOR,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: '#333',
      backgroundColor: '#fffdf5',
    },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: '#e5e7eb',
      backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    chipText: { fontSize: 14, fontWeight: '600', color: '#888' },
    chipTextActive: { color: '#fff' },

    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    switchLeft: { flex: 1, marginRight: 12 },
    switchLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 2 },
    switchDesc: { fontSize: 12, color: '#888', lineHeight: 16 },
    divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },

    detailsToggle: {
      backgroundColor: '#fff',
      borderRadius: 18,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: ACCENT, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
      borderWidth: 1.5, borderColor: BORDER_COLOR,
      marginBottom: 14,
    },
    detailsToggleLeft: { flex: 1, gap: 2 },
    detailsToggleTitle: { fontSize: 15, fontWeight: '800', color: ACCENT_DARK },
    detailsToggleHint: { fontSize: 11, color: '#888' },
    detailsToggleArrow: { fontSize: 14, color: '#888', fontWeight: '600' },
    detailsContent: { gap: 0 },

    confirmSummary: {
      backgroundColor: '#fef3c7',
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: BORDER_COLOR,
    },
    confirmLabel: { fontSize: 12, fontWeight: '700', color: ACCENT_DARK, marginBottom: 4 },
    confirmText: { fontSize: 13, color: ACCENT_DARK, lineHeight: 20 },

    genBtn: {
      backgroundColor: ACCENT,
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
      shadowColor: ACCENT,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
      marginBottom: 8,
    },
    genBtnDisabled: { backgroundColor: '#ccc', shadowOpacity: 0 },
    genBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    genHint: {
      textAlign: 'center',
      fontSize: 13,
      color: 'rgba(217,119,6,0.6)',
      marginTop: 8,
      marginBottom: 4,
    },
  });
}
