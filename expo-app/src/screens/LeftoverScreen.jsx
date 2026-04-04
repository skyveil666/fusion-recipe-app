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

const LEFTOVER_TYPES = ['生もの', '汁もの', 'おかず', 'ご飯・麺', '野菜系'];
const TIME_OPTIONS   = ['5分', '10分', '15分', '20分'];
const SERVINGS_OPTIONS = ['1人前', '2人前', '3人前', '4人前'];

const ACCENT = '#0f766e';
const ACCENT_DARK = '#134e4a';
const BG_LIGHT = '#f0fdfa';
const BORDER_COLOR = '#99f6e4';

export default function LeftoverScreen({ navigation }) {
  const { canGenerate: canUseRecipe, useRecipe, setRecipeResult, setRecipeSource, setFusionParams, addToHistory } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [leftoverText, setLeftoverText]       = useState('');
  const [leftoverType, setLeftoverType]       = useState('おかず');
  const [cookingTime, setCookingTime]         = useState('15分');
  const [servings, setServings]               = useState('2人前');
  const [lessSeasoning, setLessSeasoning]     = useState(false);
  const [homeIngredients, setHomeIngredients] = useState(false);
  const [lessSteps, setLessSteps]             = useState(false);
  const [isExcludeEnabled, setIsExcludeEnabled] = useState(false);
  const [excludeText, setExcludeText]         = useState('');
  const [loading, setLoading]                 = useState(false);

  const canGenerate = leftoverText.trim().length > 0;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const generate = async () => {
    if (!canGenerate) {
      Alert.alert('入力が必要です', '残り物の内容を入力してください。');
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
        leftoverText: leftoverText.trim(),
        leftoverType,
        cookingTime,
        servings,
        lessSeasoning,
        homeIngredients,
        lessSteps,
        excludeList,
      };

      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'leftover', params }),
      });
      if (!res.ok) {
        let errBody = '';
        try { errBody = JSON.stringify(await res.json()); } catch {}
        throw new Error(`HTTP ${res.status}: ${errBody}`);
      }
      useRecipe();
      const data = await res.json();

      setRecipeResult(data.recipe);
      setRecipeSource('leftover');
      setFusionParams({ leftoverText: leftoverText.trim(), leftoverType, cookingTime, servings, type: 'leftover' });
      if (data.shareId) addToHistory({ id: data.shareId, recipe: data.recipe, type: 'leftover' });
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      Alert.alert('エラー', e.message || 'レシピの生成に失敗しました。もう一度お試しください。');
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
          <Text style={s.headerTitle}>残り物アレンジ</Text>
          <Text style={s.headerDesc}>もったいないを、おいしいに変える</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 残り物を入力 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>🍱 残り物の内容</Text>
            <Text style={s.cardNote}>何が残っていますか？（例: 刺身、昨日の鍋、煮物、余ったご飯）</Text>
            <TextInput
              style={s.input}
              placeholder="例: 昨日のカレー、余った刺身、鍋の残り..."
              placeholderTextColor="#aaa"
              value={leftoverText}
              onChangeText={setLeftoverText}
              maxLength={50}
              multiline
            />
          </View>

          {/* 残り物の種類 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>🗂️ 残り物の種類</Text>
            <View style={s.chipRow}>
              {LEFTOVER_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.chip, leftoverType === t && s.chipActive]}
                  onPress={() => setLeftoverType(t)}
                >
                  <Text style={[s.chipText, leftoverType === t && s.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
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

          {/* オプション */}
          <View style={s.card}>
            <Text style={s.cardLabel}>⚙️ こだわり設定</Text>

            <View style={s.switchRow}>
              <View style={s.switchLeft}>
                <Text style={s.switchLabel}>調味料少なめ</Text>
                <Text style={s.switchDesc}>家にある基本調味料を2〜4種類に絞る</Text>
              </View>
              <Switch
                value={lessSeasoning}
                onValueChange={setLessSeasoning}
                trackColor={{ false: '#ddd', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>

            <View style={s.divider} />

            <View style={s.switchRow}>
              <View style={s.switchLeft}>
                <Text style={s.switchLabel}>家にあるもので作る</Text>
                <Text style={s.switchDesc}>買い足し最小限・特殊食材を使わない</Text>
              </View>
              <Switch
                value={homeIngredients}
                onValueChange={setHomeIngredients}
                trackColor={{ false: '#ddd', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>

            <View style={s.divider} />

            <View style={s.switchRow}>
              <View style={s.switchLeft}>
                <Text style={s.switchLabel}>工程少なめ</Text>
                <Text style={s.switchDesc}>手順・洗い物を増やしすぎない</Text>
              </View>
              <Switch
                value={lessSteps}
                onValueChange={setLessSteps}
                trackColor={{ false: '#ddd', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* 除外キーワード */}
          <View style={s.card}>
            <View style={s.switchRow}>
              <View style={s.switchLeft}>
                <Text style={s.cardLabel}>🚫 除外キーワード（任意）</Text>
                <Text style={s.switchDesc}>使いたくない食材や調理法を入力</Text>
              </View>
              <Switch
                value={isExcludeEnabled}
                onValueChange={setIsExcludeEnabled}
                trackColor={{ false: '#ddd', true: ACCENT }}
                thumbColor="#fff"
              />
            </View>
            {isExcludeEnabled && (
              <TextInput
                style={[s.input, { marginTop: 12 }]}
                placeholder="例: 揚げ物、辛いもの、にんにく（カンマ区切り）"
                placeholderTextColor="#aaa"
                value={excludeText}
                onChangeText={setExcludeText}
              />
            )}
          </View>

          {/* サマリー */}
          {canGenerate && (
            <View style={s.confirmSummary}>
              <Text style={s.confirmLabel}>📋 今の設定</Text>
              <Text style={s.confirmText}>
                {[leftoverText.trim(), leftoverType, cookingTime, servings].join('　/　')}
              </Text>
            </View>
          )}

          {/* 生成ボタン */}
          <TouchableOpacity
            style={[s.genBtn, !canGenerate && s.genBtnDisabled]}
            onPress={generate}
            activeOpacity={0.85}
          >
            <Text style={s.genBtnText}>♻️ アレンジレシピを作る</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>

        <BottomNav navigation={navigation} />
        {loading && <LoadingOverlay message="アレンジレシピを考えています..." />}
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
      backgroundColor: '#f9fffe',
    },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: BORDER_COLOR,
      backgroundColor: '#fff',
    },
    chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
    chipText: { fontSize: 14, fontWeight: '600', color: ACCENT },
    chipTextActive: { color: '#fff' },

    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    switchLeft: { flex: 1, marginRight: 12 },
    switchLabel: { fontSize: 15, fontWeight: '700', color: '#333' },
    switchDesc: { fontSize: 12, color: '#888', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#e6faf8', marginVertical: 10 },

    confirmSummary: {
      backgroundColor: '#e6faf8',
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: BORDER_COLOR,
    },
    confirmLabel: { fontSize: 11, fontWeight: '700', color: ACCENT, opacity: 0.7, marginBottom: 4 },
    confirmText: { fontSize: 14, fontWeight: '600', color: ACCENT_DARK, lineHeight: 20 },

    genBtn: {
      backgroundColor: ACCENT,
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 6,
      shadowColor: ACCENT,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    genBtnDisabled: { backgroundColor: '#99f6e4' },
    genBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  });
}
