import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import { COUNTRIES_BY_REGION, JAPAN_MUNICIPALITIES, API_BASE } from '../constants';
import TastePreferenceCard from '../components/TastePreferenceCard';
import UsageIndicator from '../components/UsageIndicator';

const COOKING_TIMES = ['10分', '20分', '30分', '45分'];
const CATEGORIES = ['主菜', '副菜', 'スープ', 'デザート'];
const MAIN_SERVINGS = ['1人前', '2人前', '3人前', '4人前'];
const COOKING_STYLES = ['和食', 'イタリアン', '中華', '韓国風', '洋食', 'エスニック'];

export default function SingleRecipeScreen({ navigation }) {
  const { allergies, setAllergies, setRecipeResult, setRecipeSource, setFusionParams, addToHistory, favoriteCountries, toggleFavoriteCountry, canGenerate, useRecipe } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [country, setCountry] = useState('');
  const [customText, setCustomText] = useState('');
  const [cookingStyle, setCookingStyle] = useState('');
  const [category, setCategory] = useState('主菜');
  const [servings, setServings] = useState('2人前');
  const [cookingTime, setCookingTime] = useState('');
  const [isCookingTimeEnabled, setIsCookingTimeEnabled] = useState(false);
  const [isIngEnabled, setIsIngEnabled] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [newIng, setNewIng] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [tastePrefs, setTastePrefs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const recentRef = useRef([]);

  const randomize = () => {
    const allCountries = Object.values(COUNTRIES_BY_REGION).flat().filter((c) => !recentRef.current.includes(c));
    const candidates = allCountries.length > 0 ? allCountries : Object.values(COUNTRIES_BY_REGION).flat();
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    recentRef.current = [picked, ...recentRef.current].slice(0, 4);
    setCountry(picked);
  };

  const addIng = () => {
    const v = newIng.trim();
    if (v && !ingredients.includes(v)) { setIngredients([...ingredients, v]); setNewIng(''); }
  };
  const addExclude = () => {
    const v = newExclude.trim();
    if (v && !allergies.includes(v)) { setAllergies([...allergies, v]); setNewExclude(''); }
  };

  const generate = async () => {
    if (!country) { Alert.alert('入力エラー', '地域・国を入力してください'); return; }
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
        country1: country, category, servings,
        cookingStyle: cookingStyle || '',
        ingredients: isIngEnabled ? ingredients : [],
        allergies,
        cookingTime: isCookingTimeEnabled ? cookingTime : '',
        tastePrefs: tastePrefs || null,
      };
      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'single', params }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'server');
      useRecipe();
      setRecipeResult(data.recipe);
      setRecipeSource('single');
      setFusionParams({ country1: country, category, servings, cookingTime: isCookingTimeEnabled ? cookingTime : '', type: 'single' });
      addToHistory(data.recipe, 'single');
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      if (e.name === 'AbortError') setGenError({ type: 'timeout', msg: '生成に時間がかかりすぎました。\nもう一度試してみてください。' });
      else if (e.message === 'Network request failed') setGenError({ type: 'network', msg: 'インターネット接続を確認してください。' });
      else setGenError({ type: 'server', msg: 'レシピの生成に失敗しました。\nしばらく待ってから再度お試しください。' });
    } finally { clearTimeout(timer); setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#1a4a80' }}>
      <LoadingOverlay visible={loading} message="レシピを生成中..." />
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.backBtn}>
              <Text style={s.backText}>‹ ホーム</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>🍳 シングルレシピ</Text>
          <Text style={s.headerSub}>1つの地域・国からレシピを生成</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 地域・国 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>🌏</Text>
              <Text style={s.cardTitle}>地域・国を選ぶ</Text>
            </View>
            {country ? (
              <View style={s.selectedRow}>
                <View style={s.selectedChip}>
                  <Text style={s.selectedChipText}>✓ {country}</Text>
                  <TouchableOpacity onPress={() => setCountry('')}>
                    <Text style={s.selectedClear}>×</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.starBtn} onPress={() => toggleFavoriteCountry(country)}>
                  <Text style={[s.starIcon, favoriteCountries.includes(country) && s.starActive]}>
                    {favoriteCountries.includes(country) ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {favoriteCountries.length > 0 && (
              <View style={{ marginBottom: 10 }}>
                <Text style={s.favLabel}>★ お気に入り</Text>
                <View style={s.favRow}>
                  {favoriteCountries.map((c) => (
                    <TouchableOpacity key={c} style={[s.favChip, country === c && s.favChipActive]} onPress={() => setCountry(c)}>
                      <Text style={[s.favChipText, country === c && s.favChipTextActive]}>★ {c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={() => { if (customText.trim()) { setCountry(customText.trim()); setCustomText(''); } }}
                placeholder="国名・市区町村など自由入力…"
                placeholderTextColor={C.textMuted}
                returnKeyType="done"
              />
              {customText.trim() ? (
                <TouchableOpacity style={s.addBtn} onPress={() => { setCountry(customText.trim()); setCustomText(''); }}>
                  <Text style={s.addBtnText}>決定</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity style={s.randomBtn} onPress={randomize}>
              <Text style={s.randomText}>🔀 ランダムに選ぶ</Text>
            </TouchableOpacity>
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
              {/* カテゴリー */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>🍽️</Text>
                  <Text style={s.cardTitle}>料理カテゴリー</Text>
                </View>
                <View style={s.pillRow}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.pill, category === cat && s.pillActive]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 料理スタイル */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>🍴</Text>
                  <Text style={s.cardTitle}>料理スタイル（任意）</Text>
                </View>
                <View style={s.styleRow}>
                  {COOKING_STYLES.map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[s.styleChip, cookingStyle === st && s.styleChipActive]}
                      onPress={() => setCookingStyle(cookingStyle === st ? '' : st)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.styleChipText, cookingStyle === st && s.styleChipTextActive]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 味の好み */}
              <TastePreferenceCard
                value={tastePrefs}
                onChange={setTastePrefs}
                accentColor="#1a4a80"
              />

              {/* 食材・除外 */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>🥗</Text>
                    <Text style={s.cardTitle}>使いたい食材や条件（任意）</Text>
                  </View>
                  <Switch value={isIngEnabled} onValueChange={setIsIngEnabled} trackColor={{ false: '#d1d5db', true: C.primary }} thumbColor={C.white} />
                </View>
                {isIngEnabled && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput style={[s.input, { flex: 1 }]} value={newIng} onChangeText={setNewIng} onSubmitEditing={addIng} placeholder="使いたい食材を入力" placeholderTextColor={C.textMuted} returnKeyType="done" />
                      <TouchableOpacity style={s.addBtn} onPress={addIng}><Text style={s.addBtnText}>追加</Text></TouchableOpacity>
                    </View>
                    {ingredients.length > 0 && (
                      <View style={s.tagWrap}>
                        {ingredients.map((ing) => (
                          <TouchableOpacity key={ing} style={s.tag} onPress={() => setIngredients(ingredients.filter((i) => i !== ing))}>
                            <Text style={s.tagText}>{ing} ×</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <View style={s.divider} />
                    <Text style={s.excludeLabel}>🚫 苦手な食材・避けたい調理法</Text>
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
                  </>
                )}
              </View>
            </View>
          )}

          {/* 生成前の確認サマリー */}
          {country && (
            <View style={s.confirmSummary}>
              <Text style={s.confirmLabel}>📋 今の設定</Text>
              <Text style={s.confirmText}>
                {[
                  country,
                  category,
                  isCookingTimeEnabled && cookingTime ? cookingTime : null,
                  servings,
                ].filter(Boolean).join('　/　')}
              </Text>
            </View>
          )}

          {/* 生成ボタン */}
          <TouchableOpacity style={s.generateBtn} onPress={generate} disabled={loading} activeOpacity={0.85}>
            <Text style={s.generateText}>✨ レシピを生成する</Text>
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
  backText: { color: '#1a4a80', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  headerSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  divider: { height: 1, backgroundColor: C.creamBorder, marginVertical: 12 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a4a80', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, gap: 8, flex: 1 },
  selectedChipText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  selectedClear: { color: '#fff', fontSize: 18, lineHeight: 20 },
  starBtn: { width: 40, height: 40, borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cream },
  starIcon: { fontSize: 20, color: C.textMuted },
  starActive: { color: '#f59e0b' },
  favLabel: { fontSize: 11, color: C.textMuted, marginBottom: 6 },
  favRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  favChip: { backgroundColor: '#fffbeb', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#fde68a' },
  favChipActive: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  favChipText: { fontSize: 13, color: '#92400e' },
  favChipTextActive: { fontWeight: '700' },
  styleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: C.creamBorder, backgroundColor: C.white },
  styleChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  styleChipText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  styleChipTextActive: { color: '#fff' },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: C.creamBorder, alignItems: 'center', backgroundColor: C.white },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  pillTextActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  timeBtn: { flex: 1, aspectRatio: 1, maxWidth: 72, borderRadius: 999, borderWidth: 1.5, borderColor: C.creamBorder, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  timeBtnActive: { backgroundColor: C.primary },
  timeBtnText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  timeBtnTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: C.cream, color: C.text },
  randomBtn: { borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  randomText: { fontSize: 14, color: C.textSub },
  addBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { backgroundColor: C.cream, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.creamBorder },
  tagText: { fontSize: 13, color: C.textSub },
  tagExclude: { backgroundColor: '#fff1f0', borderColor: '#fca5a5' },
  tagExcludeText: { color: '#b91c1c' },
  excludeLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 6 },
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
