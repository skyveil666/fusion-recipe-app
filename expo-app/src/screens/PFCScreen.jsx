import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_BASE } from '../constants';
import UsageIndicator from '../components/UsageIndicator';

const COOKING_TIMES = ['10分', '20分', '30分', '45分'];
const MAIN_SERVINGS = ['1人前', '2人前', '3人前', '4人前'];

const PFC_PRESETS = [
  {
    id: 'balance',
    emoji: '🍽️',
    label: 'バランス',
    desc: '迷ったらこれ\n毎日の食事向け',
    recommended: true,
    bgColor: '#e8f5e2',
    accentColor: '#3a5a18',
    pfc: { p: 30, f: 25, c: 45 },
  },
  {
    id: 'protein',
    emoji: '🥩',
    label: '高たんぱく',
    desc: 'たんぱく質を\nしっかりとりたい時に',
    bgColor: '#e3edf9',
    accentColor: '#1a4a80',
    pfc: { p: 40, f: 20, c: 40 },
  },
  {
    id: 'healthy',
    emoji: '🥬',
    label: 'ヘルシー',
    desc: '野菜多めで\n軽めに食べたい時に',
    bgColor: '#f0fde4',
    accentColor: '#3d7a00',
    pfc: { p: 25, f: 20, c: 55 },
  },
  {
    id: 'hearty',
    emoji: '🍛',
    label: 'がっつり',
    desc: '食べごたえ重視で\nしっかり満足したい時に',
    bgColor: '#fff3e0',
    accentColor: '#a05c00',
    pfc: { p: 25, f: 35, c: 40 },
  },
];

// 調整時に優先して変化させる栄養素の順序
const ADJUST_PRIORITY = { p: ['c', 'f'], f: ['p', 'c'], c: ['p', 'f'] };

const PFC_COLORS = { p: '#3b82f6', f: '#f97316', c: '#22c55e' };
const PFC_LABELS = {
  p: { name: 'たんぱく質', sub: 'P' },
  f: { name: '脂質', sub: 'F' },
  c: { name: '炭水化物', sub: 'C' },
};

export default function PFCScreen({ navigation }) {
  const { allergies, setAllergies, setRecipeResult, setRecipeSource, setFusionParams, addToHistory, canGenerate: canUseRecipe, useRecipe } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [pfcPreset, setPfcPreset] = useState('balance');
  const [pfc, setPfc] = useState({ p: 30, f: 25, c: 45 });
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [servings, setServings] = useState('2人前');
  const [customServings, setCustomServings] = useState(5);
  const [showCustomServings, setShowCustomServings] = useState(false);
  const [cookingTime, setCookingTime] = useState('');
  const [isIngEnabled, setIsIngEnabled] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [newIng, setNewIng] = useState('');
  const [isExcludeEnabled, setIsExcludeEnabled] = useState(false);
  const [newExclude, setNewExclude] = useState('');
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !loading });
  }, [loading, navigation]);

  const selectPreset = (id) => {
    setPfcPreset(id);
    const preset = PFC_PRESETS.find((p) => p.id === id);
    if (preset) setPfc({ ...preset.pfc });
  };

  // 1つの栄養素を5%刻みで調整し、残り2つを自動補正（合計100%を維持）
  const adjustPfc = (key, delta) => {
    const cur = { ...pfc };
    const newMain = cur[key] + delta;
    if (newMain < 10 || newMain > 80) return;

    const [first, second] = ADJUST_PRIORITY[key];
    const compensate = -delta;

    const newFirst = cur[first] + compensate;
    if (newFirst >= 10 && newFirst <= 80) {
      setPfc({ ...cur, [key]: newMain, [first]: newFirst });
      return;
    }

    // firstが境界に達した場合: 残りをsecondで補う
    const clampedFirst = Math.max(10, Math.min(80, newFirst));
    const usedFromFirst = clampedFirst - cur[first];
    const remainder = compensate - usedFromFirst;
    const newSecond = cur[second] + remainder;
    if (newSecond < 10 || newSecond > 80) return;
    setPfc({ ...cur, [key]: newMain, [first]: clampedFirst, [second]: newSecond });
  };

  const addIng = () => {
    const v = newIng.trim();
    if (v && !ingredients.includes(v)) { setIngredients([...ingredients, v]); setNewIng(''); }
  };
  const addExclude = () => {
    const v = newExclude.trim();
    if (v && !allergies.includes(v)) { setAllergies([...allergies, v]); setNewExclude(''); }
  };

  const effectiveServings = showCustomServings ? `${customServings}人前` : servings;

  // プリセットの初期値と現在値が異なれば「カスタム調整済み」
  const selectedPreset = PFC_PRESETS.find((p) => p.id === pfcPreset);
  const isCustomized = selectedPreset && (
    pfc.p !== selectedPreset.pfc.p ||
    pfc.f !== selectedPreset.pfc.f ||
    pfc.c !== selectedPreset.pfc.c
  );

  const generate = async () => {
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
    setLoading(true); setGenError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const params = {
        pfcPreset,
        customPfc: isCustomOpen ? pfc : null,
        servings: effectiveServings,
        allergies,
        ingredients: isIngEnabled ? ingredients : [],
        cookingTime,
      };
      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pfc', params }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'server');
      useRecipe();
      setRecipeResult(data.recipe);
      setRecipeSource('pfc');
      setFusionParams({ pfcPreset, pfc: isCustomOpen ? pfc : null, servings: effectiveServings, cookingTime, type: 'pfc' });
      addToHistory(data.recipe, 'pfc');
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      if (e.name === 'AbortError') setGenError({ type: 'timeout', msg: '生成に時間がかかりすぎました。\nもう一度試してみてください。' });
      else if (e.message === 'Network request failed') setGenError({ type: 'network', msg: 'インターネット接続を確認してください。' });
      else setGenError({ type: 'server', msg: 'レシピの生成に失敗しました。\nしばらく待ってから再度お試しください。' });
    } finally { clearTimeout(timer); setLoading(false); }
  };

  // 設定サマリー
  const summaryParts = [
    isCustomOpen && isCustomized ? `カスタム P${pfc.p}/F${pfc.f}/C${pfc.c}` : selectedPreset?.label,
    cookingTime || '時間指定なし',
    effectiveServings,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#6a1a8a' }}>
      <LoadingOverlay visible={loading} message="レシピを生成中..." />
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.backBtn}>
              <Text style={s.backText}>‹ ホーム</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>🍽️ 栄養スタイル</Text>
          <Text style={s.headerSub}>食べ方に合わせてレシピを作ります</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 栄養スタイル選択 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>🎯</Text>
              <Text style={s.cardTitle}>食べ方を選んでください</Text>
            </View>
            <View style={s.presetGrid}>
              {PFC_PRESETS.map((pr) => (
                <TouchableOpacity
                  key={pr.id}
                  style={[
                    s.presetCard,
                    { backgroundColor: pr.bgColor, borderColor: pr.accentColor + '44' },
                    pfcPreset === pr.id && { borderColor: pr.accentColor, borderWidth: 2.5 },
                  ]}
                  onPress={() => selectPreset(pr.id)}
                  activeOpacity={0.85}
                >
                  {pr.recommended && pfcPreset !== pr.id && (
                    <View style={[s.recommendBadge, { backgroundColor: pr.accentColor }]}>
                      <Text style={s.recommendText}>おすすめ</Text>
                    </View>
                  )}
                  {pfcPreset === pr.id && (
                    <View style={[s.presetCheck, { backgroundColor: pr.accentColor }]}>
                      <Text style={s.presetCheckText}>✓</Text>
                    </View>
                  )}
                  <Text style={s.presetEmoji}>{pr.emoji}</Text>
                  <Text style={[s.presetLabel, { color: pr.accentColor }]}>{pr.label}</Text>
                  <Text style={[s.presetDesc, { color: pr.accentColor + 'cc' }]}>{pr.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedPreset && (
              <View style={[s.selectedNote, { backgroundColor: selectedPreset.bgColor, borderColor: selectedPreset.accentColor + '44' }]}>
                <Text style={[s.selectedNoteText, { color: selectedPreset.accentColor }]}>
                  {selectedPreset.emoji} 「{selectedPreset.label}」モードでレシピを生成します
                </Text>
              </View>
            )}
          </View>

          {/* カスタムPFC調整（折りたたみ） */}
          <View style={s.card}>
            <TouchableOpacity
              style={s.customToggleRow}
              onPress={() => setIsCustomOpen(!isCustomOpen)}
              activeOpacity={0.8}
            >
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>🔧</Text>
                <View>
                  <Text style={s.cardTitle}>細かく調整する</Text>
                  {isCustomized && isCustomOpen && (
                    <Text style={s.customizedBadge}>調整中</Text>
                  )}
                </View>
              </View>
              <Text style={s.toggleArrow}>{isCustomOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {!isCustomOpen && (
              <Text style={s.cardDesc}>P / F / C の割合を自分向けに微調整できます</Text>
            )}

            {isCustomOpen && (
              <>
                {/* 合計表示 */}
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>合計</Text>
                  <Text style={s.totalValue}>100%</Text>
                </View>

                {/* 3本のスライダー */}
                {(['p', 'f', 'c']).map((key) => {
                  const color = PFC_COLORS[key];
                  const { name, sub } = PFC_LABELS[key];
                  const val = pfc[key];
                  const barWidth = `${val}%`;

                  return (
                    <View key={key} style={s.sliderRow}>
                      <View style={s.sliderLabelRow}>
                        <View style={[s.sliderDot, { backgroundColor: color }]} />
                        <Text style={s.sliderName}>{name}</Text>
                        <Text style={s.sliderSub}>（{sub}）</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={[s.sliderValue, { color }]}>{val}%</Text>
                      </View>
                      <View style={s.sliderControls}>
                        <TouchableOpacity
                          style={[s.sliderBtn, { borderColor: color }]}
                          onPress={() => adjustPfc(key, -5)}
                          disabled={val <= 10}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.sliderBtnText, { color: val <= 10 ? '#ccc' : color }]}>－</Text>
                        </TouchableOpacity>
                        <View style={s.barContainer}>
                          <View style={[s.barFill, { width: barWidth, backgroundColor: color }]} />
                        </View>
                        <TouchableOpacity
                          style={[s.sliderBtn, { borderColor: color }]}
                          onPress={() => adjustPfc(key, +5)}
                          disabled={val >= 80}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.sliderBtnText, { color: val >= 80 ? '#ccc' : color }]}>＋</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* リセットボタン */}
                <TouchableOpacity
                  style={s.resetBtn}
                  onPress={() => { const pr = PFC_PRESETS.find((p) => p.id === pfcPreset); if (pr) setPfc({ ...pr.pfc }); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.resetBtnText}>↺ プリセットに戻す</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* 調理時間 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>⏱️</Text>
              <Text style={s.cardTitle}>調理時間</Text>
            </View>
            <Text style={s.cardDesc}>かけられる時間を選んでください（選ばなくてもOK）</Text>
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
          </View>

          {/* 人前 */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardEmoji}>👥</Text>
              <Text style={s.cardTitle}>何人前？</Text>
            </View>
            <View style={s.pillRow}>
              {MAIN_SERVINGS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.pill, !showCustomServings && servings === opt && s.pillActive]}
                  onPress={() => { setServings(opt); setShowCustomServings(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.pillText, !showCustomServings && servings === opt && s.pillTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.pill, showCustomServings && s.pillActive]}
                onPress={() => setShowCustomServings(!showCustomServings)}
                activeOpacity={0.8}
              >
                <Text style={[s.pillText, showCustomServings && s.pillTextActive]}>＋人数指定</Text>
              </TouchableOpacity>
            </View>
            {showCustomServings && (
              <View style={s.stepperRow}>
                <TouchableOpacity style={s.stepperBtn} onPress={() => setCustomServings(Math.max(1, customServings - 1))}>
                  <Text style={s.stepperBtnText}>－</Text>
                </TouchableOpacity>
                <Text style={s.stepperValue}>{customServings}人前</Text>
                <TouchableOpacity style={s.stepperBtn} onPress={() => setCustomServings(Math.min(20, customServings + 1))}>
                  <Text style={s.stepperBtnText}>＋</Text>
                </TouchableOpacity>
              </View>
            )}
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
              {/* 食材・条件（任意） */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>🛒</Text>
                    <Text style={s.cardTitle}>使いたい食材（任意）</Text>
                  </View>
                  <Switch value={isIngEnabled} onValueChange={setIsIngEnabled} trackColor={{ false: '#d1d5db', true: C.primary }} thumbColor={C.white} />
                </View>
                <Text style={s.cardDesc}>使いたい食材や入れたい条件を追加できます</Text>
                {isIngEnabled && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        value={newIng}
                        onChangeText={setNewIng}
                        onSubmitEditing={addIng}
                        placeholder="例: 鶏肉、きのこ、野菜多め"
                        placeholderTextColor={C.textMuted}
                        returnKeyType="done"
                      />
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
                  </>
                )}
              </View>

              {/* 除外キーワード */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>🚫</Text>
                    <Text style={s.cardTitle}>苦手な食材・調理法（任意）</Text>
                  </View>
                  <Switch value={isExcludeEnabled} onValueChange={setIsExcludeEnabled} trackColor={{ false: '#d1d5db', true: C.primary }} thumbColor={C.white} />
                </View>
                <Text style={s.cardDesc}>苦手な食材や使いたくない調理法を除けます</Text>
                {isExcludeEnabled && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        value={newExclude}
                        onChangeText={setNewExclude}
                        onSubmitEditing={addExclude}
                        placeholder="例: ピーマン、辛いもの、揚げ物"
                        placeholderTextColor={C.textMuted}
                        returnKeyType="done"
                      />
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

          {/* 今の設定サマリー */}
          {pfcPreset && (
            <View style={s.confirmSummary}>
              <Text style={s.confirmLabel}>📋 今の設定</Text>
              <Text style={s.confirmText}>
                {[
                  isCustomOpen && isCustomized ? `カスタム P${pfc.p}/F${pfc.f}/C${pfc.c}` : selectedPreset?.label,
                  cookingTime || '時間指定なし',
                  effectiveServings,
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
  backText: { color: '#6a1a8a', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginTop: 4 },
  headerSub: { fontSize: 13, color: C.textSub, marginTop: 2 },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  cardDesc: { fontSize: 12, color: C.textMuted, marginBottom: 10, lineHeight: 17 },

  // Preset
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  presetCard: {
    width: '47%', borderRadius: 16, padding: 14, borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    position: 'relative', minHeight: 120,
  },
  recommendBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  recommendText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  presetCheck: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  presetCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  presetEmoji: { fontSize: 32, marginBottom: 6 },
  presetLabel: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  presetDesc: { fontSize: 12, lineHeight: 17 },
  selectedNote: { marginTop: 12, borderRadius: 12, padding: 10, borderWidth: 1, alignItems: 'center' },
  selectedNoteText: { fontSize: 13, fontWeight: '600' },

  // Custom PFC
  customToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleArrow: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  customizedBadge: {
    fontSize: 10, fontWeight: '700', color: '#6a1a8a',
    backgroundColor: '#f3e8fb', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, alignSelf: 'flex-start', marginTop: 2, overflow: 'hidden',
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    marginTop: 12, marginBottom: 6, gap: 6,
  },
  totalLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  totalValue: { fontSize: 15, fontWeight: '800', color: '#6a1a8a' },

  // Slider rows
  sliderRow: { marginBottom: 16 },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  sliderDot: { width: 10, height: 10, borderRadius: 5 },
  sliderName: { fontSize: 14, fontWeight: '600', color: C.text },
  sliderSub: { fontSize: 12, color: C.textMuted },
  sliderValue: { fontSize: 22, fontWeight: '800', minWidth: 52, textAlign: 'right' },

  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.white,
  },
  sliderBtnText: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  barContainer: {
    flex: 1, height: 14, backgroundColor: '#f0f0f0',
    borderRadius: 7, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 7, minWidth: 8 },

  resetBtn: {
    marginTop: 4, borderWidth: 1, borderColor: '#6a1a8a44',
    borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    backgroundColor: '#faf5ff',
  },
  resetBtnText: { fontSize: 13, color: '#6a1a8a', fontWeight: '600' },

  // Time
  timeRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  timeBtn: { flex: 1, aspectRatio: 1, maxWidth: 72, borderRadius: 999, borderWidth: 1.5, borderColor: C.creamBorder, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  timeBtnActive: { backgroundColor: C.primary },
  timeBtnText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  timeBtnTextActive: { color: '#fff' },

  // Servings
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  pill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.creamBorder, backgroundColor: C.white },
  pillActive: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
  pillTextActive: { color: '#fff' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 14 },
  stepperBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  stepperBtnText: { fontSize: 22, fontWeight: '700', color: C.primary },
  stepperValue: { fontSize: 20, fontWeight: '700', color: C.text, minWidth: 80, textAlign: 'center' },

  // Ingredients
  input: { borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: C.cream, color: C.text },
  addBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { backgroundColor: C.cream, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.creamBorder },
  tagText: { fontSize: 13, color: C.textSub },
  tagExclude: { backgroundColor: '#fff1f0', borderColor: '#fca5a5' },
  tagExcludeText: { color: '#b91c1c' },

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

  // Summary & Generate
  summaryCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: C.primary + '44', alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: '600', letterSpacing: 0.5 },
  summaryText: { fontSize: 15, fontWeight: '700', color: C.primary },
  confirmSummary: {
    backgroundColor: '#f0fde4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 3,
  },
  confirmLabel: { fontSize: 11, fontWeight: '700', color: '#3a5a18', opacity: 0.7 },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#1a2e0a', lineHeight: 20 },
  generateBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  generateText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  errorCard: { backgroundColor: '#fff1f0', borderRadius: 14, borderWidth: 1, borderColor: '#fca5a5', padding: 16, alignItems: 'center', gap: 8, marginTop: 4 },
  errorIcon: { fontSize: 32 },
  errorMsg: { fontSize: 13, color: '#7f1d1d', textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
