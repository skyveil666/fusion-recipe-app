import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_BASE } from '../constants';
import TastePreferenceCard from '../components/TastePreferenceCard';
import UsageIndicator from '../components/UsageIndicator';

const COOKING_TIMES = ['10分', '20分', '30分', '45分'];
const CATEGORIES = ['主菜', '副菜', 'スープ', 'デザート'];
const MAIN_SERVINGS = ['1人前', '2人前', '3人前', '4人前'];

const SEASONAL_DATA = {
  春: {
    emoji: '🌸',
    monthRange: '3月〜5月',
    color: '#e8a4c0',
    ingredients: [
      'たけのこ', '菜の花', 'あさり', 'さわら', '春キャベツ', '新玉ねぎ', 'そら豆', 'グリーンピース',
      'うど', 'せり', 'わかめ', '桜エビ', '新じゃがいも', 'アスパラガス', '春にんじん',
      'ふきのとう', 'こごみ', 'タラの芽', '木の芽', '春ごぼう', 'いちご', '新ごぼう',
      'サヤエンドウ', 'スナップエンドウ', 'はまぐり', '山椒', 'ニラ', '三つ葉', '春菊', '土筆',
    ],
  },
  夏: {
    emoji: '☀️',
    monthRange: '6月〜8月',
    color: '#f5a623',
    ingredients: [
      'トマト', '枝豆', 'とうもろこし', 'ゴーヤ', 'なす', 'きゅうり', 'ピーマン', 'オクラ',
      'アジ', 'かつお', '鱧', 'すいか', '桃', 'みょうが', 'しそ',
      'ズッキーニ', 'パプリカ', 'モロヘイヤ', 'つるむらさき', 'カボス', 'スズキ', 'うなぎ',
      'イサキ', '冬瓜', 'ハモ', 'バジル', 'マンゴー', 'ブルーベリー', 'プラム', 'いちじく',
    ],
  },
  秋: {
    emoji: '🍂',
    monthRange: '9月〜11月',
    color: '#e07020',
    ingredients: [
      '松茸', '舞茸', 'さつまいも', 'さんま', '栗', '柿', '里芋', 'かぼちゃ',
      'ぶどう', '梨', '銀杏', '鮭', 'いくら', 'れんこん', 'ごぼう',
      'ナメコ', 'エリンギ', 'ハタケシメジ', '新米', 'むかご', 'さば', 'あじ', '鰯',
      '秋なす', '落花生', 'ざくろ', 'アケビ', 'マイタケ', 'ブナシメジ', '香茸',
    ],
  },
  冬: {
    emoji: '❄️',
    monthRange: '12月〜2月',
    color: '#4a80c0',
    ingredients: [
      'ほうれん草', '白菜', '大根', 'ねぎ', 'ぶり', 'カキ', 'タラ', '金目鯛',
      '春菊', 'れんこん', 'かぶ', 'みかん', 'ゆず', 'セリ', '水菜',
      'あんこう', 'ふぐ', 'ズワイガニ', 'クエ', 'ヒラメ', '小松菜', 'チンゲン菜',
      '聖護院大根', '金時にんじん', '里芋', 'セロリ', 'キンカン', '伊予柑', '春水菜',
    ],
  },
};

const DISPLAY_COUNT = 12;

function shuffleIngredients(ingredients, count) {
  const shuffled = [...ingredients].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return '春';
  if (m >= 6 && m <= 8) return '夏';
  if (m >= 9 && m <= 11) return '秋';
  return '冬';
}

export default function SeasonalScreen({ navigation }) {
  const { allergies, setAllergies, setRecipeResult, setRecipeSource, setFusionParams, addToHistory, canGenerate, useRecipe } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const currentSeason = getCurrentSeason();
  const [season, setSeason] = useState(currentSeason);
  const [selectedIng, setSelectedIng] = useState('');
  const [displayedIngredients, setDisplayedIngredients] = useState(
    () => shuffleIngredients(SEASONAL_DATA[currentSeason].ingredients, DISPLAY_COUNT)
  );

  const handleSeasonChange = useCallback((newSeason) => {
    setSeason(newSeason);
    setSelectedIng('');
    setDisplayedIngredients(shuffleIngredients(SEASONAL_DATA[newSeason].ingredients, DISPLAY_COUNT));
  }, []);

  const handleShuffle = useCallback(() => {
    setSelectedIng('');
    setDisplayedIngredients(shuffleIngredients(SEASONAL_DATA[season].ingredients, DISPLAY_COUNT));
  }, [season]);
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('主菜');
  const [servings, setServings] = useState('2人前');
  const [cookingTime, setCookingTime] = useState('');
  const [isCookingTimeEnabled, setIsCookingTimeEnabled] = useState(false);
  const [newExclude, setNewExclude] = useState('');
  const [tastePrefs, setTastePrefs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const seasonData = SEASONAL_DATA[season];

  const addExclude = () => {
    const v = newExclude.trim();
    if (v && !allergies.includes(v)) { setAllergies([...allergies, v]); setNewExclude(''); }
  };

  const generate = async () => {
    if (!canGenerate) {
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
    setLoading(true); setGenError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const params = {
        season,
        seasonalIngredients: selectedIng ? [selectedIng] : seasonData.ingredients.slice(0, 5),
        country1: country || '',
        category, servings, allergies,
        cookingTime: isCookingTimeEnabled ? cookingTime : '',
        tastePrefs: tastePrefs || null,
      };
      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'seasonal', params }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'server');
      useRecipe();
      setRecipeResult(data.recipe);
      setRecipeSource('seasonal');
      setFusionParams({
        type: 'seasonal',
        season,
        selectedIng: selectedIng || '',
        country1: country || '',
        category,
        servings,
        cookingTime: isCookingTimeEnabled ? cookingTime : '',
      });
      addToHistory(data.recipe, 'seasonal');
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      if (e.name === 'AbortError') setGenError({ type: 'timeout', msg: '生成に時間がかかりすぎました。\nもう一度試してみてください。' });
      else if (e.message === 'Network request failed') setGenError({ type: 'network', msg: 'インターネット接続を確認してください。' });
      else setGenError({ type: 'server', msg: 'レシピの生成に失敗しました。\nしばらく待ちから再度お試しください。' });
    } finally { clearTimeout(timer); setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#a05c00' }}>
      <LoadingOverlay visible={loading} message="旬のレシピを生成中..." />
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.backBtn}>
              <Text style={s.backText}>‹ ホーム</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>🌿 旬の食材レシピ</Text>
          <Text style={s.headerSub}>今の季節の食材を使ったレシピを生成</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 季節選択 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>{seasonData.emoji}</Text>
              <Text style={s.cardTitle}>季節を選ぶ</Text>
            </View>
            <View style={s.pillRow}>
              {Object.keys(SEASONAL_DATA).map((se) => (
                <TouchableOpacity
                  key={se}
                  style={[s.pill, season === se && { backgroundColor: SEASONAL_DATA[se].color, borderColor: SEASONAL_DATA[se].color }]}
                  onPress={() => handleSeasonChange(se)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.pillText, season === se && s.pillTextActive]}>
                    {SEASONAL_DATA[se].emoji} {se}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.seasonMonth}>{seasonData.monthRange} の旬の食材</Text>
          </View>

          {/* 旬の食材選択 */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>🌱</Text>
                <Text style={s.cardTitle}>旬の食材を選ぶ（任意）</Text>
              </View>
              <TouchableOpacity style={s.shuffleBtn} onPress={handleShuffle} activeOpacity={0.75}>
                <Text style={s.shuffleBtnText}>🔀 別の食材を見る</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.seasonNote}>選択しない場合はAIが旬の食材を自動で選びます</Text>
            <View style={s.ingGrid}>
              {displayedIngredients.map((ing) => (
                <TouchableOpacity
                  key={ing}
                  style={[s.ingChip, selectedIng === ing && { backgroundColor: seasonData.color, borderColor: seasonData.color }]}
                  onPress={() => setSelectedIng(selectedIng === ing ? '' : ing)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.ingChipText, selectedIng === ing && s.ingChipTextActive]}>{ing}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 調理時間 */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>⏱️</Text>
                <Text style={s.cardTitle}>調理時間</Text>
              </View>
              <Switch value={isCookingTimeEnabled} onValueChange={(v) => { setIsCookingTimeEnabled(v); if (!v) setCookingTime(''); }} trackColor={{ false: '#d1d5db', true: C.primary }} thumbColor={C.white} />
            </View>
            {isCookingTimeEnabled && (
              <View style={s.timeRow}>
                {COOKING_TIMES.map((t) => (
                  <TouchableOpacity key={t} style={[s.timeBtn, cookingTime === t && s.timeBtnActive]} onPress={() => setCookingTime(cookingTime === t ? '' : t)} activeOpacity={0.8}>
                    <Text style={[s.timeBtnText, cookingTime === t && s.timeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 人前 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>👥</Text>
              <Text style={s.cardTitle}>人前</Text>
            </View>
            <View style={s.pillRow}>
              {MAIN_SERVINGS.map((opt) => (
                <TouchableOpacity key={opt} style={[s.pill, servings === opt && s.pillActive]} onPress={() => setServings(opt)} activeOpacity={0.8}>
                  <Text style={[s.pillText, servings === opt && s.pillTextActive]}>{opt}</Text>
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
              {/* 地域（任意） */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>🗾</Text>
                  <Text style={s.cardTitle}>地域スタイル（任意）</Text>
                </View>
                <Text style={s.seasonNote}>入力すると、その地域の料理スタイルでアレンジします</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="例: 長野県、イタリア（省略可）"
                    placeholderTextColor={C.textMuted}
                    returnKeyType="done"
                  />
                  {country ? (
                    <TouchableOpacity style={s.clearBtn} onPress={() => setCountry('')}>
                      <Text style={s.clearBtnText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* カテゴリー */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>🍽️</Text>
                  <Text style={s.cardTitle}>料理カテゴリー</Text>
                </View>
                <View style={s.pillRow}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity key={cat} style={[s.pill, category === cat && s.pillActive]} onPress={() => setCategory(cat)} activeOpacity={0.8}>
                      <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 味の好み */}
              <TastePreferenceCard
                value={tastePrefs}
                onChange={setTastePrefs}
                accentColor="#a05c00"
              />

              {/* 除外キーワード */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>🚫</Text>
                  <Text style={s.cardTitle}>苦手な食材・避けたい調理法（任意）</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput style={[s.input, { flex: 1 }]} value={newExclude} onChangeText={setNewExclude} onSubmitEditing={addExclude} placeholder="含めたくない食材・調理法" placeholderTextColor={C.textMuted} returnKeyType="done" />
                  <TouchableOpacity style={s.addBtn} onPress={addExclude}><Text style={s.addBtnText}>追加</Text></TouchableOpacity>
                </View>
                {allergies.length > 0 && (
                  <View style={s.tagWrap}>
                    {allergies.map((a) => (
                      <TouchableOpacity key={a} style={[s.tag, s.tagExclude]} onPress={() => setAllergies(allergies.filter((x) => x !== a))}>
                        <Text style={[s.tagText, s.tagExcludeText]}>{a} ×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* 生成前の確認サマリー */}
          <View style={s.confirmSummary}>
            <Text style={s.confirmLabel}>📋 今の設定</Text>
            <Text style={s.confirmText}>
              {[
                `${seasonData.emoji} ${season}`,
                selectedIng || null,
                isCookingTimeEnabled && cookingTime ? cookingTime : null,
                servings,
              ].filter(Boolean).join('　/　')}
            </Text>
          </View>

          {/* 生成ボタン */}
          <TouchableOpacity style={s.generateBtn} onPress={generate} disabled={loading} activeOpacity={0.85}>
            <Text style={s.generateText}>✨ 旬のレシピを生成する</Text>
          </TouchableOpacity>

          {genError && (
            <View style={s.errorCard}>
              <Text style={s.errorIcon}>{genError.type === 'timeout' ? '⏱️' : genError.type === 'network' ? '📵' : '⚠️'}</Text>
              <Text style={s.errorMsg}>{genError.msg}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={generate}><Text style={s.retryText}>🔄 もう一度試す</Text></TouchableOpacity>
            </View>
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
  header: { backgroundColor: C.cream, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.creamBorder },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#a05c00', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  headerSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shuffleBtn: { backgroundColor: '#e8f5e0', borderWidth: 1, borderColor: '#4a8020', borderRadius: 16, paddingVertical: 5, paddingHorizontal: 10 },
  shuffleBtnText: { color: '#2d5a1b', fontSize: 12, fontWeight: '600' },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  seasonMonth: { fontSize: 12, color: C.textMuted, marginTop: 10, textAlign: 'center' },
  seasonNote: { fontSize: 12, color: C.textMuted, marginBottom: 10 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', backgroundColor: C.white },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: C.primary },
  pillTextActive: { color: '#fff' },
  ingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.creamBorder, backgroundColor: C.cream },
  ingChipText: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  ingChipTextActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  timeBtn: { flex: 1, aspectRatio: 1, maxWidth: 72, borderRadius: 999, borderWidth: 2, borderColor: C.primary, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  timeBtnActive: { backgroundColor: C.primary },
  timeBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  timeBtnTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: C.cream, color: C.text },
  clearBtn: { width: 44, borderRadius: 12, borderWidth: 1, borderColor: C.creamBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  clearBtnText: { fontSize: 16, color: C.textMuted },
  addBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { backgroundColor: C.cream, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.creamBorder },
  tagText: { fontSize: 13, color: C.textSub },
  tagExclude: { backgroundColor: '#fff1f0', borderColor: '#fca5a5' },
  tagExcludeText: { color: '#b91c1c' },
  confirmSummary: {
    backgroundColor: C.cream, borderRadius: 12, borderWidth: 1,
    borderColor: C.primary + '44', paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 4, marginBottom: 2, gap: 3,
  },
  confirmLabel: { fontSize: 11, fontWeight: '700', color: C.primary, opacity: 0.7 },
  confirmText: { fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 20 },
  detailsToggle: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: C.creamBorder,
  },
  detailsToggleLeft: { flex: 1, gap: 2 },
  detailsToggleTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  detailsToggleHint: { fontSize: 11, color: C.textMuted },
  detailsToggleArrow: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
  detailsContent: { gap: 12 },
  generateBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  generateText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  errorCard: { backgroundColor: '#fff1f0', borderRadius: 14, borderWidth: 1, borderColor: '#fca5a5', padding: 16, alignItems: 'center', gap: 8, marginTop: 4 },
  errorIcon: { fontSize: 32 },
  errorMsg: { fontSize: 13, color: '#7f1d1d', textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
