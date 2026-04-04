import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import MapSelectModal from '../components/MapSelectModal';
import { COUNTRIES_BY_REGION, JAPAN_MUNICIPALITIES, API_BASE } from '../constants';
import UsageIndicator from '../components/UsageIndicator';

const MAIN_SERVINGS = ['1人前', '2人前', '3人前', '4人前'];
const COOKING_TIMES = ['10分', '20分', '30分', '45分'];

function PillRow({ options, value, onChange, s }) {
  return (
    <View style={s.pillRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[s.pill, value === opt && s.pillActive]}
          onPress={() => onChange(value === opt ? '' : opt)}
          activeOpacity={0.8}
        >
          <Text style={[s.pillText, value === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CountryInput({ label, value, onChange, favorites, onToggleFavorite, C, s }) {
  const [customText, setCustomText] = useState('');

  const handleSelect = (country) => { onChange(country); setCustomText(''); };
  const handleCustomSubmit = () => {
    const v = customText.trim();
    if (v) { onChange(v); setCustomText(''); }
  };
  const handleStarToggle = () => {
    if (!value) return;
    if (!favorites.includes(value) && favorites.length >= 10) {
      Alert.alert('上限に達しました', 'お気に入りは10件までです');
      return;
    }
    onToggleFavorite(value);
  };

  return (
    <View style={s.countryBlock}>
      <Text style={s.inputLabel}>{label}</Text>

      {value ? (
        <View style={s.selectedRow}>
          <View style={s.selectedChip}>
            <Text style={s.selectedChipText}>✓ {value}</Text>
            <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.selectedClear}>×</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.starBtn} onPress={handleStarToggle}>
            <Text style={[s.starIcon, favorites.includes(value) && s.starActive]}>
              {favorites.includes(value) ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {favorites.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={s.favSectionLabel}>★ お気に入り</Text>
          <View style={s.favChipRow}>
            {favorites.map((c) => (
              <View key={c} style={[s.favChip, value === c && s.favChipActive]}>
                <TouchableOpacity onPress={() => handleSelect(c)}>
                  <Text style={[s.favChipText, value === c && s.favChipTextActive]}>★ {c}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onToggleFavorite(c)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={s.favChipRemove}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={customText}
          onChangeText={setCustomText}
          onSubmitEditing={handleCustomSubmit}
          placeholder="市区町村など自由入力…"
          placeholderTextColor={C.textMuted}
          returnKeyType="done"
        />
        {customText.trim() ? (
          <TouchableOpacity style={s.addBtn} onPress={handleCustomSubmit}>
            <Text style={s.addBtnText}>決定</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function FusionSelectScreen({ navigation }) {
  const {
    fusionParams: p, setFusionParams,
    allergies, setAllergies,
    setRecipeResult, setRecipeSource,
    favoriteCountries, toggleFavoriteCountry,
    addToHistory,
    canGenerate: canUseRecipe, useRecipe,
  } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [newIng, setNewIng] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [isIngEnabled, setIsIngEnabled] = useState(false);
  const [isServingsEnabled, setIsServingsEnabled] = useState(false);
  const [isCookingTimeEnabled, setIsCookingTimeEnabled] = useState(false);
  const [cookingTime, setCookingTime] = useState('');
  const [customServingsCount, setCustomServingsCount] = useState(5);
  const [isCustomServings, setIsCustomServings] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const set = (k, v) => setFusionParams((prev) => ({ ...prev, [k]: v }));

  // 直近4カ国を記憶して重複排除
  const recentCountries = useRef([]);

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 世界＋日本: 1枠=世界の国, 2枠=日本の都道府県・市区町村
  const randomizeWorldJapan = () => {
    const allForeign = Object.values(COUNTRIES_BY_REGION).flat().filter((c) => c !== '日本');
    const foreignCandidates = allForeign.filter((c) => !recentCountries.current.includes(c));
    const c1 = foreignCandidates.length > 0 ? rand(foreignCandidates) : rand(allForeign);

    const japanCandidates = JAPAN_MUNICIPALITIES.filter(
      (m) => !recentCountries.current.includes(m)
    );
    const c2 = japanCandidates.length > 0 ? rand(japanCandidates) : rand(JAPAN_MUNICIPALITIES);

    recentCountries.current = [c1, c2, ...recentCountries.current].slice(0, 4);
    setFusionParams((prev) => ({ ...prev, country1: c1, country2: c2 }));
  };

  // 世界ランダム: 両枠=海外、できるだけ異なるリージョン
  const randomizeWorld = () => {
    const allRegions = Object.keys(COUNTRIES_BY_REGION);
    const region1 = rand(allRegions);
    const c1Candidates = COUNTRIES_BY_REGION[region1].filter(
      (c) => !recentCountries.current.includes(c) && c !== '日本'
    );
    const c1 = c1Candidates.length > 0
      ? rand(c1Candidates)
      : rand(COUNTRIES_BY_REGION[region1].filter((c) => c !== '日本'));

    const otherRegions = allRegions.filter((r) => r !== region1);
    const region2 = rand(otherRegions.length > 0 ? otherRegions : allRegions);
    const c2Candidates = COUNTRIES_BY_REGION[region2].filter(
      (c) => !recentCountries.current.includes(c) && c !== c1 && c !== '日本'
    );
    const c2 = c2Candidates.length > 0
      ? rand(c2Candidates)
      : rand(COUNTRIES_BY_REGION[region2].filter((c) => c !== c1 && c !== '日本'));

    recentCountries.current = [c1, c2, ...recentCountries.current].slice(0, 4);
    setFusionParams((prev) => ({ ...prev, country1: c1, country2: c2 }));
  };

  // 日本ランダム: 両枠=日本の市町村・都道府県
  const randomizeJapan = () => {
    const c1Candidates = JAPAN_MUNICIPALITIES.filter(
      (m) => !recentCountries.current.includes(m)
    );
    const c1 = c1Candidates.length > 0 ? rand(c1Candidates) : rand(JAPAN_MUNICIPALITIES);

    const c2Candidates = JAPAN_MUNICIPALITIES.filter(
      (m) => !recentCountries.current.includes(m) && m !== c1
    );
    const c2 = c2Candidates.length > 0
      ? rand(c2Candidates)
      : rand(JAPAN_MUNICIPALITIES.filter((m) => m !== c1));

    recentCountries.current = [c1, c2, ...recentCountries.current].slice(0, 4);
    setFusionParams((prev) => ({ ...prev, country1: c1, country2: c2 }));
  };

  const addIng = () => {
    const v = newIng.trim();
    if (v && !p.ingredients.includes(v)) {
      set('ingredients', [...p.ingredients, v]);
      setNewIng('');
    }
  };

  const addExclude = () => {
    const v = newExclude.trim();
    if (v && !allergies.includes(v)) {
      setAllergies([...allergies, v]);
      setNewExclude('');
    }
  };

  const generate = async () => {
    if (!p.country1 || !p.country2) {
      Alert.alert('入力エラー', '2つの国／地域を選択してください');
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
    setGenError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const params = { ...p, allergies };
      if (isCookingTimeEnabled && cookingTime) params.cookingTime = cookingTime;
      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fusion', params }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'server');
      useRecipe();
      setRecipeResult(data.recipe);
      setRecipeSource('fusion');
      addToHistory(data.recipe);
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      if (e.name === 'AbortError') {
        setGenError({ type: 'timeout', msg: '生成に時間がかかりすぎました。\nもう一度試してみてください。' });
      } else if (e.message === 'Network request failed' || e.message === 'Failed to fetch') {
        setGenError({ type: 'network', msg: 'インターネット接続を確認してください。\nWi-Fiまたはモバイルデータが必要です。' });
      } else {
        setGenError({ type: 'server', msg: 'レシピの生成に失敗しました。\nしばらく待ってからもう一度お試しください。' });
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
      <LoadingOverlay visible={loading} message="レシピを生成中..." />
      <MapSelectModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        onSelect={(value, slot) => {
          if (slot === 1) set('country1', value);
          else set('country2', value);
        }}
      />
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.backBtn}>
              <Text style={s.backText}>‹ ホーム</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>世界の味を発見しよう</Text>
          <Text style={s.headerSub}>2つの国や市町村を入力してフュージョンレシピを作成</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ① 国や市町村を入力 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>🌍</Text>
              <Text style={s.cardTitle}>国や市町村を入力</Text>
            </View>
            <CountryInput
              label="① 国や市町村"
              value={p.country1}
              onChange={(v) => set('country1', v)}
              favorites={favoriteCountries}
              onToggleFavorite={toggleFavoriteCountry}
              C={C} s={s}
            />
            <View style={s.divider} />
            <CountryInput
              label="② 国や市町村"
              value={p.country2}
              onChange={(v) => set('country2', v)}
              favorites={favoriteCountries}
              onToggleFavorite={toggleFavoriteCountry}
              C={C} s={s}
            />
            {/* Random buttons */}
            <TouchableOpacity style={s.randomBtnPrimary} onPress={randomizeWorldJapan} activeOpacity={0.85}>
              <Text style={s.randomBtnPrimaryText}>🌍🗾 世界＋日本 ランダム</Text>
            </TouchableOpacity>
            <View style={s.randomRow}>
              <TouchableOpacity style={[s.randomBtnSub, { flex: 1 }]} onPress={randomizeWorld} activeOpacity={0.85}>
                <Text style={s.randomBtnSubText}>🌍 世界ランダム</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.randomBtnSub, { flex: 1 }]} onPress={randomizeJapan} activeOpacity={0.85}>
                <Text style={s.randomBtnSubText}>🗾 日本ランダム</Text>
              </TouchableOpacity>
            </View>
            {/* 地図から選ぶ */}
            <TouchableOpacity
              style={s.mapBtn}
              onPress={() => setMapModalVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={s.mapBtnText}>🗺️ 地図から選ぶ</Text>
            </TouchableOpacity>
          </View>

          {/* ② 調理時間 */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>⏱️</Text>
                <Text style={s.cardTitle}>調理時間</Text>
              </View>
              <Switch
                value={isCookingTimeEnabled}
                onValueChange={(v) => { setIsCookingTimeEnabled(v); if (!v) setCookingTime(''); }}
                trackColor={{ false: '#d1d5db', true: C.primary }}
                thumbColor={C.white}
              />
            </View>
            {isCookingTimeEnabled && (
              <View style={s.timeRow}>
                {COOKING_TIMES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeBtn, cookingTime === t && s.timeBtnActive]}
                    onPress={() => setCookingTime(cookingTime === t ? '' : t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.timeBtnText, cookingTime === t && s.timeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ④ 食材・条件 */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>🥗</Text>
                <Text style={s.cardTitle}>使いたい食材や条件</Text>
              </View>
              <Switch
                value={isIngEnabled}
                onValueChange={setIsIngEnabled}
                trackColor={{ false: '#d1d5db', true: C.primary }}
                thumbColor={C.white}
              />
            </View>
            {isIngEnabled && (
              <>
                {/* 食材入力 */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={newIng}
                    onChangeText={setNewIng}
                    onSubmitEditing={addIng}
                    placeholder="例: トマト、鶏肉、チーズ"
                    placeholderTextColor={C.textMuted}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={s.addBtn} onPress={addIng}>
                    <Text style={s.addBtnText}>追加</Text>
                  </TouchableOpacity>
                </View>
                {p.ingredients.length > 0 && (
                  <View style={s.tagWrap}>
                    {p.ingredients.map((ing) => (
                      <TouchableOpacity
                        key={ing}
                        style={s.tag}
                        onPress={() => set('ingredients', p.ingredients.filter((i) => i !== ing))}
                      >
                        <Text style={s.tagText}>{ing} ×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 除外キーワード */}
                <View style={s.divider} />
                <Text style={s.excludeLabel}>🚫 苦手な食材・避けたい調理法</Text>
                <Text style={s.subLabel}>含めたくない食材や調理法を入力してください</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={newExclude}
                    onChangeText={setNewExclude}
                    onSubmitEditing={addExclude}
                    placeholder="例: ピーマン、揚げ物、生クリーム"
                    placeholderTextColor={C.textMuted}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={s.addBtn} onPress={addExclude}>
                    <Text style={s.addBtnText}>追加</Text>
                  </TouchableOpacity>
                </View>
                {allergies.length > 0 && (
                  <View style={s.tagWrap}>
                    {allergies.map((a) => (
                      <TouchableOpacity
                        key={a}
                        style={[s.tag, s.tagExclude]}
                        onPress={() => setAllergies(allergies.filter((x) => x !== a))}
                      >
                        <Text style={[s.tagText, s.tagExcludeText]}>{a} ×</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          {/* ⑤ 人前設定 */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>👥</Text>
                <Text style={s.cardTitle}>人前設定</Text>
              </View>
              <Switch
                value={isServingsEnabled}
                onValueChange={(v) => {
                  setIsServingsEnabled(v);
                  if (!v) { set('servings', ''); setIsCustomServings(false); }
                }}
                trackColor={{ false: '#d1d5db', true: C.primary }}
                thumbColor={C.white}
              />
            </View>
            {isServingsEnabled && (
              <>
                {/* 1〜4人前 + 人数指定ボタン */}
                <View style={s.servingsRow}>
                  {MAIN_SERVINGS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.servingBtn, !isCustomServings && p.servings === opt && s.servingBtnActive]}
                      onPress={() => {
                        set('servings', opt);
                        setIsCustomServings(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.servingBtnText, !isCustomServings && p.servings === opt && s.servingBtnTextActive]}>
                        {opt.replace('人前', '\n人前')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[s.servingBtnSub, isCustomServings && s.servingBtnActive]}
                    onPress={() => {
                      setIsCustomServings(true);
                      set('servings', `${customServingsCount}人前`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.servingBtnSubText, isCustomServings && s.servingBtnTextActive]}>
                      ＋人数{'\n'}指定
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ステッパーUI */}
                {isCustomServings && (
                  <View style={s.stepperRow}>
                    <TouchableOpacity
                      style={s.stepperBtn}
                      onPress={() => {
                        const next = Math.max(1, customServingsCount - 1);
                        setCustomServingsCount(next);
                        set('servings', `${next}人前`);
                      }}
                    >
                      <Text style={s.stepperBtnText}>－</Text>
                    </TouchableOpacity>
                    <Text style={s.stepperValue}>{customServingsCount}人</Text>
                    <TouchableOpacity
                      style={s.stepperBtn}
                      onPress={() => {
                        const next = Math.min(20, customServingsCount + 1);
                        setCustomServingsCount(next);
                        set('servings', `${next}人前`);
                      }}
                    >
                      <Text style={s.stepperBtnText}>＋</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>

          {/* 生成前の確認サマリー */}
          {(p.country1 || p.country2) && (
            <View style={s.confirmSummary}>
              <Text style={s.confirmLabel}>📋 今の設定</Text>
              <Text style={s.confirmText}>
                {[
                  p.country1 && p.country2 ? `${p.country1} × ${p.country2}` : (p.country1 || p.country2),
                  isCookingTimeEnabled && cookingTime ? cookingTime : null,
                  isServingsEnabled ? (isCustomServings ? `${customServingsCount}人前` : p.servings || null) : null,
                ].filter(Boolean).join('　/　')}
              </Text>
            </View>
          )}

          {/* ⑥ レシピを生成するボタン */}
          <TouchableOpacity
            style={[s.generateBtn, loading && { opacity: 0.6 }]}
            onPress={generate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.generateText}>✨ レシピを生成する</Text>
            }
          </TouchableOpacity>

          {/* エラー表示 */}
          {genError && (
            <View style={s.errorCard}>
              <Text style={s.errorIcon}>
                {genError.type === 'timeout' ? '⏱️' : genError.type === 'network' ? '📵' : '⚠️'}
              </Text>
              <Text style={s.errorMsg}>{genError.msg}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={generate} activeOpacity={0.85}>
                <Text style={s.retryText}>🔄 もう一度試す</Text>
              </TouchableOpacity>
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
  header: {
    backgroundColor: C.cream,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.creamBorder,
  },
  backBtn: { paddingVertical: 4 },
  backText: { color: C.primary, fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  headerSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  scroll: { padding: 16, gap: 12 },

  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  divider: { height: 1, backgroundColor: C.creamBorder, marginVertical: 14 },

  // CountryInput
  countryBlock: { marginBottom: 4 },
  inputLabel: { fontSize: 11, color: C.textMuted, marginBottom: 6 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.primary, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, gap: 8, flex: 1,
  },
  selectedChipText: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
  selectedClear: { color: '#fff', fontSize: 18, lineHeight: 20 },
  starBtn: {
    width: 40, height: 40,
    borderWidth: 1, borderColor: C.creamBorder,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.cream,
  },
  starIcon: { fontSize: 20, color: C.textMuted },
  starActive: { color: '#f59e0b' },
  favSectionLabel: { fontSize: 11, color: C.textMuted, marginBottom: 6 },
  favChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  favChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fffbeb', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#fde68a',
  },
  favChipActive: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  favChipText: { fontSize: 13, color: '#92400e' },
  favChipTextActive: { fontWeight: '700' },
  favChipRemove: { fontSize: 15, color: '#92400e', lineHeight: 18 },

  // Time buttons (round)
  timeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  timeBtn: {
    flex: 1, aspectRatio: 1, maxWidth: 72,
    borderRadius: 999, borderWidth: 2,
    borderColor: C.primary, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center',
  },
  timeBtnActive: { backgroundColor: C.primary },
  timeBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  timeBtnTextActive: { color: '#fff' },

  // Inputs
  input: {
    borderWidth: 1, borderColor: C.creamBorder,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, backgroundColor: C.cream, color: C.text,
  },
  randomBtnPrimary: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginTop: 12,
  },
  randomBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  randomRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  randomBtnSub: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', backgroundColor: C.white,
  },
  randomBtnSubText: { fontSize: 13, fontWeight: '600', color: C.primary },
  mapBtn: {
    borderWidth: 1.5, borderColor: C.accent, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', backgroundColor: '#fff8f0',
    marginTop: 8, flexDirection: 'row', justifyContent: 'center',
  },
  mapBtnText: { fontSize: 13, fontWeight: '700', color: C.accent },

  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: {
    flex: 1, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: C.creamBorder,
    alignItems: 'center', backgroundColor: C.white,
  },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontSize: 13, color: C.textSub },
  pillTextActive: { color: '#fff', fontWeight: '600' },

  subLabel: { fontSize: 12, color: C.textMuted, marginBottom: 8, marginTop: 2 },
  excludeLabel: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 4 },
  addBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: {
    backgroundColor: C.cream, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: C.creamBorder,
  },
  tagText: { fontSize: 13, color: C.textSub },
  tagExclude: { backgroundColor: '#fff1f0', borderColor: '#fca5a5' },
  tagExcludeText: { color: '#b91c1c' },

  confirmSummary: {
    backgroundColor: C.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primary + '44',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
    marginBottom: 2,
    gap: 3,
  },
  confirmLabel: { fontSize: 11, fontWeight: '700', color: C.primary, opacity: 0.7 },
  confirmText: { fontSize: 14, fontWeight: '600', color: C.text, lineHeight: 20 },

  generateBtn: {
    backgroundColor: C.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  errorCard: {
    backgroundColor: '#fff1f0', borderRadius: 14,
    borderWidth: 1, borderColor: '#fca5a5',
    padding: 16, alignItems: 'center', gap: 8, marginTop: 4,
  },
  errorIcon: { fontSize: 32 },
  errorMsg: { fontSize: 13, color: '#7f1d1d', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#dc2626', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 24, marginTop: 4,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  pfcPresetRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  pfcPresetBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.primary,
    alignItems: 'center', backgroundColor: C.white,
  },
  pfcPresetBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  pfcPresetText: { fontSize: 12, fontWeight: '600', color: C.primary },
  pfcPresetTextActive: { color: '#fff' },
  heartyNote: {
    fontSize: 13, color: C.textSub, textAlign: 'center',
    marginTop: 8, backgroundColor: C.white,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.creamBorder,
  },

  pfcBtn: {
    width: 32, height: 32, borderRadius: 8,
    borderWidth: 1, borderColor: C.creamBorder,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.white,
  },
  pfcBtnText: { fontSize: 16, color: C.text, lineHeight: 20 },

  // Servings
  servingsRow: { flexDirection: 'row', gap: 8 },
  servingBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.white,
  },
  servingBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  servingBtnText: { fontSize: 12, fontWeight: '600', color: C.primary, textAlign: 'center', lineHeight: 16 },
  servingBtnSub: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.creamBorder,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.white,
  },
  servingBtnSubText: { fontSize: 11, fontWeight: '600', color: C.textSub, textAlign: 'center', lineHeight: 15 },
  servingBtnTextActive: { color: '#fff' },

  // Stepper
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 14, backgroundColor: C.cream, borderRadius: 14,
    paddingVertical: 6, paddingHorizontal: 8, alignSelf: 'center',
  },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.white,
  },
  stepperBtnText: { fontSize: 20, color: C.primary, fontWeight: '700', lineHeight: 24 },
  stepperValue: {
    fontSize: 22, fontWeight: '700', color: C.text,
    minWidth: 72, textAlign: 'center',
  },

  // Category
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.primary,
    alignItems: 'center', backgroundColor: C.white,
  },
  categoryBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },
  categoryBtnTextActive: { color: '#fff' },
});
