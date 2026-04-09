import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Alert, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_BASE } from '../constants';
import UsageIndicator from '../components/UsageIndicator';

const SERVINGS_OPTIONS = ['1人前', '2人前', '3人前', '4人前'];

// ── step: 'idle' | 'detecting' | 'review' | 'generating'
export default function PhotoRecipeScreen({ navigation }) {
  const { allergies, setAllergies, setRecipeResult, setRecipeSource, setFusionParams, addToHistory, canGenerate: canUseRecipe, useRecipe } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState('idle');

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: step !== 'detecting' && step !== 'generating' });
  }, [step, navigation]);
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [servings, setServings] = useState('2人前');
  const [isExcludeEnabled, setIsExcludeEnabled] = useState(false);
  const [newExclude, setNewExclude] = useState('');
  const [localAllergies, setLocalAllergies] = useState([]);
  const [genError, setGenError] = useState(null);

  const pickImage = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('カメラの許可が必要です', '設定からカメラへのアクセスを許可してください。');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('写真へのアクセスが必要です', '設定から写真へのアクセスを許可してください。');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
        });
      }

      if (result.canceled) return;

      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64);
      detectIngredients(asset.base64);
    } catch (e) {
      Alert.alert('エラー', '写真の取得に失敗しました。');
    }
  };

  const detectIngredients = async (base64) => {
    setStep('detecting');
    setGenError(null);
    try {
      const res = await fetch(`${API_BASE}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: 'image/jpeg' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'detection failed');
      const ings = Array.isArray(data.ingredients) ? data.ingredients : [];
      setDetectedIngredients(ings);
      setSelectedIngredients([...ings]);
      setStep('review');
    } catch (e) {
      setStep('idle');
      Alert.alert('食材の読み取りに失敗しました', 'もう一度試してみてください。');
    }
  };

  const toggleIngredient = (ing) => {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  };

  const generate = async () => {
    if (selectedIngredients.length === 0) {
      Alert.alert('食材を選んでください', '少なくとも1つの食材を選択してください。');
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
    setStep('generating');
    setGenError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const excludeList = [...allergies, ...localAllergies];
      const res = await fetch(`${API_BASE}/api/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'photo',
          params: {
            ingredients: selectedIngredients,
            servings,
            allergies: excludeList,
          },
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'server');
      useRecipe();
      setRecipeResult(data.recipe);
      setRecipeSource('photo');
      setFusionParams({ type: 'photo', servings });
      addToHistory(data.recipe, 'photo');
      if (!navigation.isFocused()) return;
      navigation.navigate('Result');
    } catch (e) {
      setStep('review');
      if (e.name === 'AbortError') setGenError({ type: 'timeout', msg: '生成に時間がかかりすぎました。\nもう一度試してみてください。' });
      else if (e.message === 'Network request failed') setGenError({ type: 'network', msg: 'インターネット接続を確認してください。' });
      else setGenError({ type: 'server', msg: 'レシピの生成に失敗しました。\nしばらく待ってから再度お試しください。' });
    } finally {
      clearTimeout(timer);
    }
  };

  const reset = () => {
    setStep('idle');
    setImageUri(null);
    setImageBase64(null);
    setDetectedIngredients([]);
    setSelectedIngredients([]);
    setGenError(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#b45309' }}>
      <LoadingOverlay
        visible={step === 'detecting' || step === 'generating'}
        message={step === 'detecting' ? '食材を読み取り中...' : 'レシピを生成中...'}
      />
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.backBtn}>
              <Text style={s.backText}>‹ ホーム</Text>
            </TouchableOpacity>
            <UsageIndicator navigation={navigation} />
          </View>
          <Text style={s.headerTitle}>📷 写真でかんたん一品</Text>
          <Text style={s.headerSub}>15分以内で作れるすぐ使える一品を提案</Text>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Step: Idle / Photo selection ── */}
          {step === 'idle' && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardEmoji}>📸</Text>
                <Text style={s.cardTitle}>写真を撮る / 選ぶ</Text>
              </View>
              <Text style={s.hintText}>冷蔵庫の中や手元の食材を撮影すると、{'\n'}AIが食材を読み取ってレシピを提案します</Text>
              <View style={s.photoButtons}>
                <TouchableOpacity style={s.photoBtn} onPress={() => pickImage(true)} activeOpacity={0.85}>
                  <Text style={s.photoBtnEmoji}>📷</Text>
                  <Text style={s.photoBtnText}>カメラで撮る</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.photoBtn, s.photoBtnSecondary]} onPress={() => pickImage(false)} activeOpacity={0.85}>
                  <Text style={s.photoBtnEmoji}>🖼️</Text>
                  <Text style={[s.photoBtnText, s.photoBtnTextSecondary]}>アルバムから選ぶ</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Step: Review ingredients ── */}
          {step === 'review' && (
            <>
              {/* Photo preview + retake */}
              <View style={s.card}>
                <View style={s.previewRow}>
                  {imageUri && <Image source={{ uri: imageUri }} style={s.previewImage} resizeMode="cover" />}
                  <TouchableOpacity style={s.retakeBtn} onPress={reset} activeOpacity={0.85}>
                    <Text style={s.retakeBtnText}>📷 撮り直す</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Detected ingredients */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>🔍</Text>
                  <Text style={s.cardTitle}>見つかった食材</Text>
                </View>
                <Text style={s.hintText}>使わない食材はタップして外してください</Text>
                {detectedIngredients.length === 0 ? (
                  <Text style={s.emptyText}>食材が検出されませんでした</Text>
                ) : (
                  <View style={s.ingGrid}>
                    {detectedIngredients.map((ing) => {
                      const active = selectedIngredients.includes(ing);
                      return (
                        <TouchableOpacity
                          key={ing}
                          style={[s.ingChip, active ? s.ingChipActive : s.ingChipInactive]}
                          onPress={() => toggleIngredient(ing)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.ingChipText, active ? s.ingChipTextActive : s.ingChipTextInactive]}>
                            {active ? '✓ ' : ''}{ing}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Servings */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardEmoji}>👥</Text>
                  <Text style={s.cardTitle}>人前</Text>
                </View>
                <View style={s.pillRow}>
                  {SERVINGS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.pill, servings === opt && s.pillActive]}
                      onPress={() => setServings(opt)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.pillText, servings === opt && s.pillTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Exclude keywords */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardEmoji}>🚫</Text>
                    <Text style={s.cardTitle}>苦手な食材・避けたい調理法（任意）</Text>
                  </View>
                  <Switch
                    value={isExcludeEnabled}
                    onValueChange={setIsExcludeEnabled}
                    trackColor={{ false: '#d1d5db', true: '#b45309' }}
                    thumbColor={C.white}
                  />
                </View>
                {isExcludeEnabled && (
                  <>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={[s.input, { flex: 1, justifyContent: 'center' }]}>
                        <Text
                          style={{ color: newExclude ? C.text : C.textMuted, fontSize: 14 }}
                          onPress={() => {}}
                        />
                      </View>
                    </View>
                    {/* Simple tag input */}
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[s.excludeInput, { flex: 1 }]}
                        onPress={() => {
                          Alert.prompt(
                            '苦手な食材・避けたい調理法',
                            '含めたくない食材や調理法を入力',
                            (text) => {
                              if (text?.trim() && !localAllergies.includes(text.trim())) {
                                setLocalAllergies([...localAllergies, text.trim()]);
                              }
                            },
                            'plain-text',
                            '',
                            'default'
                          );
                        }}
                      >
                        <Text style={s.excludeInputText}>+ キーワードを追加</Text>
                      </TouchableOpacity>
                    </View>
                    {localAllergies.length > 0 && (
                      <View style={s.tagWrap}>
                        {localAllergies.map((a) => (
                          <TouchableOpacity key={a} style={s.tagExclude} onPress={() => setLocalAllergies(localAllergies.filter((x) => x !== a))}>
                            <Text style={s.tagExcludeText}>{a} ×</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Generate button */}
              <TouchableOpacity
                style={[s.generateBtn, selectedIngredients.length === 0 && s.generateBtnDisabled]}
                onPress={generate}
                disabled={selectedIngredients.length === 0}
                activeOpacity={0.85}
              >
                <Text style={s.generateText}>✨ 一品レシピを作る</Text>
              </TouchableOpacity>

              {genError && (
                <View style={s.errorCard}>
                  <Text style={s.errorIcon}>{genError.type === 'timeout' ? '⏱️' : genError.type === 'network' ? '📵' : '⚠️'}</Text>
                  <Text style={s.errorMsg}>{genError.msg}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={generate}>
                    <Text style={s.retryText}>🔄 もう一度試す</Text>
                  </TouchableOpacity>
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
  header: { backgroundColor: C.cream, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.creamBorder },
  backBtn: { paddingVertical: 4 },
  backText: { color: '#b45309', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 4 },
  headerSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: C.text },

  hintText: { fontSize: 12, color: C.textSub, lineHeight: 18, marginBottom: 14 },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 8 },

  // Photo buttons
  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1, backgroundColor: '#b45309', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', gap: 6,
  },
  photoBtnSecondary: { backgroundColor: C.white, borderWidth: 2, borderColor: '#b45309' },
  photoBtnEmoji: { fontSize: 28 },
  photoBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  photoBtnTextSecondary: { color: '#b45309' },

  // Preview
  previewRow: { gap: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 12 },
  retakeBtn: { borderWidth: 1.5, borderColor: '#b45309', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  retakeBtnText: { fontSize: 13, fontWeight: '600', color: '#b45309' },

  // Ingredient chips
  ingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  ingChipActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  ingChipInactive: { backgroundColor: C.white, borderColor: '#d1d5db' },
  ingChipText: { fontSize: 13, fontWeight: '600' },
  ingChipTextActive: { color: '#fff' },
  ingChipTextInactive: { color: C.textMuted },

  // Servings pills
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#b45309', alignItems: 'center', backgroundColor: C.white },
  pillActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#b45309' },
  pillTextActive: { color: '#fff' },

  // Exclude
  excludeInput: { backgroundColor: C.cream, borderRadius: 12, borderWidth: 1, borderColor: C.creamBorder, paddingHorizontal: 14, paddingVertical: 12 },
  excludeInputText: { fontSize: 13, color: C.textMuted },
  input: { borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: C.cream, color: C.text },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagExclude: { backgroundColor: '#fff1f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#fca5a5' },
  tagExcludeText: { fontSize: 13, color: '#b91c1c' },

  // Generate
  generateBtn: { backgroundColor: '#b45309', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 4 },
  generateBtnDisabled: { opacity: 0.4 },
  generateText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Error
  errorCard: { backgroundColor: '#fff1f0', borderRadius: 14, borderWidth: 1, borderColor: '#fca5a5', padding: 16, alignItems: 'center', gap: 8, marginTop: 4 },
  errorIcon: { fontSize: 32 },
  errorMsg: { fontSize: 13, color: '#7f1d1d', textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: '#dc2626', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, marginTop: 4 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
