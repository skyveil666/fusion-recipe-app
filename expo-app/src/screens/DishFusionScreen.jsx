import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import TastePreferenceCard from '../components/TastePreferenceCard';
import UsageIndicator from '../components/UsageIndicator';
import { API_BASE } from '../constants';

const TIME_OPTIONS = ['10分', '15分', '20分'];
const SERVINGS_OPTIONS = ['1人前', '2人前', '3人前', '4人前'];

export default function DishFusionScreen({ navigation }) {
  const { allergies, setAllergies, setRecipeResult, setRecipeSource, setFusionParams, addToHistory, canGenerate: canUseRecipe, useRecipe } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [dishName, setDishName] = useState('');
  const [addIngredient, setAddIngredient] = useState('');
  const [cookingTime, setCookingTime] = useState('15分');
  const [servings, setServings] = useState('2人前');
  const [lessSeasoning, setLessSeasoning] = useState(false);
  const [homeIngredients, setHomeIngredients] = useState(false);
  const [lessSteps, setLessSteps] = useState(false);
  const [isExcludeEnabled, setIsExcludeEnabled] = useState(false);
  const [excludeText, setExcludeText] = useState('');
  const [tastePrefs, setTastePrefs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const canGenerate = dishName.trim().length > 0 && addIngredient.trim().length > 0;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const generate = async () => {
    if (!canGenerate) {
      Alert.alert('入力が必要です', '料理名と追加食材を入力してください。');
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
        dishName: dishName.trim(),
        addIngredient: addIngredient.trim(),
        cookingTime,
        servings,
        lessSeasoning,
        homeIngredients,
        lessSteps,
        allergies: [...allergies, ...excludeList],
        tastePrefs: tastePrefs || null,
      };

      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'dish_fusion', params }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      useRecipe();
      const data = await res.json();

      setRecipeResult(data.recipe);
      setRecipeSource('dish_fusion');
      setFusionParams({
        dishName: dishName.trim(),
        addIngredient: addIngredient.trim(),
        cookingTime,
        servings,
        type: 'dish_fusion',
      });
      addToHistory(data.recipe, 'dish');
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      Alert.alert('エラー', 'レシピの生成に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#3b1f6e' }}>
      <View style={[s.screen, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backText}>← 戻る</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>料理×食材フュージョン</Text>
          <Text style={s.headerDesc}>家にある食材でちょっと意外な一皿を</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 料理名 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>🍽️ 料理名</Text>
            <Text style={s.cardNote}>どんな料理をアレンジしますか？（例: 麻婆豆腐、カレー、チャーハン）</Text>
            <TextInput
              style={s.input}
              placeholder="例: カレー、パスタ、炒め物..."
              placeholderTextColor="#bbb"
              value={dishName}
              onChangeText={setDishName}
              maxLength={30}
            />
          </View>

          {/* 追加したい食材 */}
          <View style={s.card}>
            <Text style={s.cardLabel}>🥬 追加したい食材</Text>
            <Text style={s.cardNote}>この食材を料理に加えます（例: アボカド、キムチ、チーズ）</Text>
            <TextInput
              style={s.input}
              placeholder="例: アボカド、キムチ、ゆで卵..."
              placeholderTextColor="#bbb"
              value={addIngredient}
              onChangeText={setAddIngredient}
              maxLength={30}
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
              {SERVINGS_OPTIONS.map(s_ => (
                <TouchableOpacity
                  key={s_}
                  style={[s.chip, servings === s_ && s.chipActive]}
                  onPress={() => setServings(s_)}
                >
                  <Text style={[s.chipText, servings === s_ && s.chipTextActive]}>{s_}</Text>
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
                    <Text style={s.switchDesc}>基本調味料2〜4種類に絞る</Text>
                  </View>
                  <Switch
                    value={lessSeasoning}
                    onValueChange={setLessSeasoning}
                    trackColor={{ false: '#ddd', true: '#7c3aed' }}
                    thumbColor={lessSeasoning ? '#fff' : '#fff'}
                  />
                </View>

                <View style={s.divider} />

                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.switchLabel}>家にあるもので作る</Text>
                    <Text style={s.switchDesc}>買い足し最小限・家庭食材を優先</Text>
                  </View>
                  <Switch
                    value={homeIngredients}
                    onValueChange={setHomeIngredients}
                    trackColor={{ false: '#ddd', true: '#7c3aed' }}
                    thumbColor={homeIngredients ? '#fff' : '#fff'}
                  />
                </View>

                <View style={s.divider} />

                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.switchLabel}>工程少なめ</Text>
                    <Text style={s.switchDesc}>2〜4ステップのシンプル構成</Text>
                  </View>
                  <Switch
                    value={lessSteps}
                    onValueChange={setLessSteps}
                    trackColor={{ false: '#ddd', true: '#7c3aed' }}
                    thumbColor={lessSteps ? '#fff' : '#fff'}
                  />
                </View>
              </View>

              {/* 味の好み */}
              <TastePreferenceCard
                value={tastePrefs}
                onChange={setTastePrefs}
                accentColor="#7c3aed"
              />

              {/* 除外キーワード */}
              <View style={s.card}>
                <View style={s.switchRow}>
                  <View style={s.switchLeft}>
                    <Text style={s.cardLabel}>🚫 苦手な食材・避けたい調理法（任意）</Text>
                    <Text style={s.switchDesc}>含めたくない食材や調理法を入力</Text>
                  </View>
                  <Switch
                    value={isExcludeEnabled}
                    onValueChange={setIsExcludeEnabled}
                    trackColor={{ false: '#ddd', true: '#7c3aed' }}
                    thumbColor={isExcludeEnabled ? '#fff' : '#fff'}
                  />
                </View>
                {isExcludeEnabled && (
                  <TextInput
                    style={[s.input, { marginTop: 12 }]}
                    placeholder="例: ナッツ、辛いもの、揚げ物（カンマ区切り）"
                    placeholderTextColor="#bbb"
                    value={excludeText}
                    onChangeText={setExcludeText}
                  />
                )}
              </View>
            </View>
          )}

          {/* 生成前の確認サマリー */}
          {canGenerate && (
            <View style={s.confirmSummary}>
              <Text style={s.confirmLabel}>📋 今の設定</Text>
              <Text style={s.confirmText}>
                {[dishName.trim(), addIngredient.trim(), cookingTime, servings].filter(Boolean).join('　/　')}
              </Text>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            style={[s.genBtn, !canGenerate && s.genBtnDisabled]}
            onPress={generate}
            activeOpacity={0.85}
          >
            <Text style={s.genBtnText}>✨ フュージョンレシピを作る</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>

        <BottomNav navigation={navigation} />
        {loading && <LoadingOverlay message="フュージョンレシピを考えています..." />}
      </View>
    </View>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f5f0ff' },
    header: {
      backgroundColor: '#3b1f6e',
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
      shadowColor: '#7c3aed',
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 2,
    },
    cardLabel: { fontSize: 15, fontWeight: '800', color: '#3b1f6e', marginBottom: 4 },
    cardNote: { fontSize: 12, color: '#888', marginBottom: 10, lineHeight: 17 },

    input: {
      borderWidth: 1.5,
      borderColor: '#ddd6fe',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: '#333',
      backgroundColor: '#faf8ff',
    },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: '#e5e7eb',
      backgroundColor: '#fff',
    },
    chipActive: {
      backgroundColor: '#7c3aed',
      borderColor: '#7c3aed',
    },
    chipText: { fontSize: 14, fontWeight: '600', color: '#888' },
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
    divider: { height: 1, backgroundColor: '#f0e8ff', marginVertical: 10 },

    detailsToggle: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#7c3aed', shadowOpacity: 0.07, shadowRadius: 6, elevation: 1,
      borderWidth: 1, borderColor: '#ddd6fe',
      marginBottom: 14,
    },
    detailsToggleLeft: { flex: 1, gap: 2 },
    detailsToggleTitle: { fontSize: 15, fontWeight: '700', color: '#3b1f6e' },
    detailsToggleHint: { fontSize: 11, color: '#888' },
    detailsToggleArrow: { fontSize: 14, color: '#888', fontWeight: '600' },
    detailsContent: { gap: 0 },

    genBtn: {
      backgroundColor: '#7c3aed',
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: 6,
      shadowColor: '#7c3aed',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    genBtnDisabled: { backgroundColor: '#c4b5fd' },
    genBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

    confirmSummary: {
      backgroundColor: '#f3eeff',
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#ddd6fe',
    },
    confirmLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', opacity: 0.7, marginBottom: 4 },
    confirmText: { fontSize: 14, fontWeight: '600', color: '#3b1f6e', lineHeight: 20 },
  });
}
