import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Share, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_BASE, pickFoodImage } from '../constants';

function NutriBadge({ value, unit, label, color, s }) {
  return (
    <View style={s.nutriBadge}>
      <Text style={[s.nutriValue, { color }]}>{value}<Text style={s.nutriUnit}>{unit}</Text></Text>
      <Text style={s.nutriLabel}>{label}</Text>
    </View>
  );
}

// ─── 一般的な食材リスト（ポップアップ不要） ────────────────────────────────
const COMMON_KEYWORDS = [
  '塩','砂糖','水','油','醤油','しょうゆ','味噌','みそ','酢','みりん','酒','料理酒',
  '小麦粉','片栗粉','薄力粉','強力粉','パン粉','コーンスターチ',
  '卵','牛乳','バター','生クリーム','豆乳','ヨーグルト','粉チーズ','チーズ',
  '玉ねぎ','にんじん','じゃがいも','さつまいも','かぼちゃ','大根','ごぼう',
  'キャベツ','レタス','ほうれん草','小松菜','ブロッコリー','なす','ピーマン',
  'トマト','きゅうり','もやし','れんこん','ねぎ','長ねぎ','青ねぎ','万能ねぎ',
  'にんにく','しょうが','生姜','唐辛子','こしょう','胡椒','七味','一味',
  '豚肉','鶏肉','牛肉','ひき肉','合いびき','豚バラ','鶏もも','鶏胸','豚こま',
  '鮭','サーモン','マグロ','えび','いか','たこ','ツナ','しらす',
  'ごま','白ごま','黒ごま','オリーブオイル','ごま油','サラダ油',
  'ケチャップ','マヨネーズ','ソース','ポン酢','コンソメ','だし','出汁','白だし','鶏がら',
  'はちみつ','メープル','砂糖','グラニュー糖','塩こしょう',
  '米','パスタ','うどん','そば','パン','食パン',
  'レモン','レモン汁','ライム',
  '豆腐','絹豆腐','木綿豆腐','納豆','油揚げ','厚揚げ',
  'しいたけ','えのき','しめじ','まいたけ','エリンギ',
];

function isCommonIngredient(name) {
  const n = name.replace(/[（(].*[)）]/g, '').trim(); // カッコ内を除去
  return COMMON_KEYWORDS.some(kw => n.includes(kw));
}

// Retry helper
async function fetchWithRetry(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

function generateHashtags(recipe, recipeSource, fusionParams) {
  const isSingle = recipeSource === 'single';
  const tags = [isSingle ? '#シングルレシピ' : '#フュージョンレシピ'];
  if (recipe.name) {
    tags.push('#' + recipe.name.replace(/[\s　・\-]/g, '').slice(0, 20));
  }
  if (isSingle && fusionParams?.country1) {
    tags.push('#' + fusionParams.country1 + 'レシピ');
    tags.push('#' + fusionParams.country1 + '料理');
  } else if (recipeSource === 'fusion' && fusionParams) {
    if (fusionParams.country1) tags.push('#' + fusionParams.country1 + '料理');
    if (fusionParams.country2) tags.push('#' + fusionParams.country2 + '料理');
    if (fusionParams.country1 && fusionParams.country2) {
      tags.push('#' + fusionParams.country1 + '×' + fusionParams.country2);
    }
  }
  (recipe.ingredients || []).slice(0, 2).forEach(ing => {
    const t = '#' + ing.name.replace(/\s/g, '');
    if (t.length > 1) tags.push(t);
  });
  tags.push('#フュージョン料理', '#世界の味', '#創作料理');
  return [...new Set(tags)].slice(0, 8);
}

export default function ResultScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    recipeResult: recipe, setRecipeResult,
    recipeSource, fusionParams, scanParams,
    allergies, dislikes, avoidMethods,
    toggleFavorite, isFavorite,
    addToHistory,
    addToShoppingList, isInShoppingList, removeFromShoppingListByName,
    updateHistoryImage,
  } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [checked, setChecked] = useState(new Set());
  const [genImage, setGenImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null); // 'arrange' | 'regenerate' | null
  const [shareLoading, setShareLoading] = useState(false);
  const [actionError, setActionError] = useState(null); // { type, msg, action }

  // Ingredient popup
  const [ingModal, setIngModal] = useState(null); // { name, amount }
  const [ingInfo, setIngInfo] = useState(null);   // { description, substitute, imageKeyword, rarity }
  const [ingLoading, setIngLoading] = useState(false);
  const [ingImgError, setIngImgError] = useState(false);
  const ingCache = useRef({});

  const openIngredient = async (name) => {
    setIngModal({ name });
    setIngInfo(null);
    setIngImgError(false);
    if (ingCache.current[name]) { setIngInfo(ingCache.current[name]); return; }
    setIngLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/ingredient?name=${encodeURIComponent(name)}`);
      const data = await r.json();
      ingCache.current[name] = data;
      setIngInfo(data);
    } catch { /* show name only */ }
    finally { setIngLoading(false); }
  };

  useEffect(() => {
    if (!recipe) return;
    if (recipe.savedImage) {
      setGenImage(recipe.savedImage);
      setImageLoading(false);
      return;
    }
    setGenImage(null);
    setImageLoading(true);
    fetch(`${API_BASE}/api/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeName: recipe.name, description: recipe.description }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.imageBase64) {
          setGenImage(d.imageBase64);
          updateHistoryImage(recipe.name, d.imageBase64);
        }
      })
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, [recipe?.name]);

  if (!recipe) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.textMuted }}>レシピが見つかりません</Text>
      </View>
    );
  }

  const fav = isFavorite(recipe.name);
  const foodImg = genImage || pickFoodImage(recipe.name);

  const toggleCheck = (name) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleShare = async () => {
    setShareLoading(true);
    // 国名タグを構築
    const c1 = fusionParams?.country1 ?? '';
    const c2 = fusionParams?.country2 ?? '';
    const fusionSuffix = c1 && c2 ? `（${c1}×${c2}）` : '';
    const category = fusionParams?.category ?? '';
    const hashTags = [
      '#フュージョンレシピ',
      c1 && `#${c1}料理`,
      c2 && `#${c2}料理`,
      c1 && c2 && `#${c1}×${c2}`,
      category && `#${category}`,
      '#創作料理',
    ].filter(Boolean).slice(0, 6).join(' ');

    let shareUrl = null;
    // Save recipe to server & get unique URL
    try {
      const res = await fetch(`${API_BASE}/api/recipe/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe, fusionParams, imageBase64: genImage ?? null }),
      });
      const d = await res.json();
      if (d.url) shareUrl = d.url;
    } catch (_) { /* share without URL if save fails */ }
    setShareLoading(false);

    const shareText = [
      `${recipe.name}${fusionSuffix}`,
      hashTags,
      shareUrl ? `📱 レシピを詳しく見る:\n${shareUrl}` : null,
    ].filter(Boolean).join('\n');

    try {
      await Share.share({
        message: shareText,
        url: shareUrl ?? undefined,
      });
    } catch (e) {
      Alert.alert('エラー', 'シェアに失敗しました');
    }
  };

  const handleFavorite = () => {
    toggleFavorite(recipe, genImage);
    Alert.alert(fav ? 'お気に入りから削除しました' : 'お気に入りに追加しました！');
  };

  const handleActionError = (e, actionFn, label) => {
    if (e.name === 'AbortError') {
      setActionError({ type: 'timeout', msg: `${label}に時間がかかりすぎました。\nもう一度試してください。`, action: actionFn });
    } else if (e.message === 'Network request failed' || e.message === 'Failed to fetch') {
      setActionError({ type: 'network', msg: 'インターネット接続を確認してください。', action: actionFn });
    } else {
      setActionError({ type: 'server', msg: `${label}に失敗しました。\nしばらく待ってから試してください。`, action: actionFn });
    }
  };

  const handleArrange = async () => {
    setActionError(null);
    setLoadingType('arrange');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const data = await fetchWithRetry(async () => {
        const res = await fetch(`${API_BASE}/api/recipe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'arrange', params: { recipe, allergies, dislikes, avoidMethods, fusionParams } }),
          signal: controller.signal,
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
      });
      setRecipeResult(data.recipe);
      addToHistory(data.recipe);
      setChecked(new Set());
    } catch (e) {
      handleActionError(e, handleArrange, 'アレンジ');
    } finally {
      clearTimeout(timer);
      setLoadingType(null);
    }
  };

  const handleRegenerate = async () => {
    setActionError(null);
    setLoadingType('regenerate');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const params = recipeSource === 'fusion'
        ? { ...fusionParams, allergies, dislikes, avoidMethods }
        : { ...scanParams, allergies, dislikes, avoidMethods };
      const data = await fetchWithRetry(async () => {
        const res = await fetch(`${API_BASE}/api/recipe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: recipeSource, params }),
          signal: controller.signal,
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        return d;
      });
      setRecipeResult(data.recipe);
      addToHistory(data.recipe);
      setChecked(new Set());
    } catch (e) {
      handleActionError(e, handleRegenerate, '再生成');
    } finally {
      clearTimeout(timer);
      setLoadingType(null);
    }
  };

  const loadingMsg =
    loadingType === 'arrange'    ? 'アレンジ中...' :
    loadingType === 'regenerate' ? '再生成中...'   : 'レシピを生成中...';

  const handleReport = () => {
    Alert.alert(
      '🚩 このレシピを報告',
      '報告する理由を選んでください',
      [
        { text: '材料・分量がおかしい', onPress: () => Alert.alert('報告を受け付けました', 'ご連絡ありがとうございます。内容を確認して改善します。') },
        { text: '手順が危険・不自然', onPress: () => Alert.alert('報告を受け付けました', 'ご連絡ありがとうございます。内容を確認して改善します。') },
        { text: 'アレルギー設定が反映されていない', onPress: () => Alert.alert('報告を受け付けました', 'ご連絡ありがとうございます。内容を確認して改善します。') },
        { text: 'その他の問題', onPress: () => Alert.alert('報告を受け付けました', 'ご連絡ありがとうございます。内容を確認して改善します。') },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
      <LoadingOverlay visible={loadingType !== null} message={loadingMsg} />
      <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={s.hero}>
            <Image source={{ uri: genImage || pickFoodImage(recipe.name) }} style={s.heroImg} />
            {imageLoading && (
              <View style={s.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={s.imageLoadingText}>画像生成中...</Text>
              </View>
            )}
          </View>

          {/* Region Display – recipeSource別に専用化 */}
          {recipeSource === 'fusion' && fusionParams?.country1 && fusionParams?.country2 ? (
            // フュージョン：2地域タグ
            <View style={s.regionBar}>
              <View style={s.regionItem}>
                <Text style={s.regionItemText}>🌏 {fusionParams.country1}</Text>
              </View>
              <Text style={s.regionPlus}>＋</Text>
              <View style={s.regionItem}>
                <Text style={s.regionItemText}>🌍 {fusionParams.country2}</Text>
              </View>
            </View>
          ) : recipeSource === 'single' && fusionParams?.country1 ? (
            // シングル：1地域 + カテゴリー + 調理時間
            <View style={s.tagBar}>
              <View style={s.tagItem}><Text style={s.tagText}>📍 {fusionParams.country1}</Text></View>
              {fusionParams?.category ? <View style={s.tagItem}><Text style={s.tagText}>🍽 {fusionParams.category}</Text></View> : null}
              {fusionParams?.cookingTime ? <View style={s.tagItem}><Text style={s.tagText}>⏱ {fusionParams.cookingTime}</Text></View> : null}
            </View>
          ) : recipeSource === 'seasonal' ? (
            // 旬の食材：季節 + 食材 + 地域スタイル
            <View style={s.tagBar}>
              {fusionParams?.season ? <View style={[s.tagItem, s.tagItemSeasonal]}><Text style={s.tagText}>
                {fusionParams.season === '春' ? '🌸' : fusionParams.season === '夏' ? '☀️' : fusionParams.season === '秋' ? '🍂' : '❄️'} {fusionParams.season}
              </Text></View> : null}
              {fusionParams?.selectedIng ? <View style={s.tagItem}><Text style={s.tagText}>🌿 {fusionParams.selectedIng}</Text></View> : null}
              {fusionParams?.category ? <View style={s.tagItem}><Text style={s.tagText}>🍽 {fusionParams.category}</Text></View> : null}
              {fusionParams?.country1 ? <View style={s.tagItem}><Text style={s.tagText}>📍 {fusionParams.country1}風</Text></View> : null}
            </View>
          ) : recipeSource === 'pfc' ? (
            // PFC：栄養モード + 調理時間 + 人前
            <View style={s.tagBar}>
              {fusionParams?.pfcPreset ? <View style={[s.tagItem, s.tagItemPfc]}><Text style={s.tagText}>💪 {fusionParams.pfcPreset}</Text></View> : null}
              {fusionParams?.cookingTime ? <View style={s.tagItem}><Text style={s.tagText}>⏱ {fusionParams.cookingTime}</Text></View> : null}
              {fusionParams?.servings ? <View style={s.tagItem}><Text style={s.tagText}>👤 {fusionParams.servings}</Text></View> : null}
            </View>
          ) : recipeSource === 'photo' ? (
            // 写真：時短 + 一品料理 + 人前
            <View style={s.tagBar}>
              <View style={[s.tagItem, s.tagItemPhoto]}><Text style={s.tagText}>⚡ 15分以内</Text></View>
              <View style={s.tagItem}><Text style={s.tagText}>🥗 一品料理</Text></View>
              {fusionParams?.servings ? <View style={s.tagItem}><Text style={s.tagText}>👤 {fusionParams.servings}</Text></View> : null}
            </View>
          ) : recipeSource === 'dish_fusion' ? (
            // 料理×食材フュージョン：料理名 + 食材 + 調理時間
            <View style={s.tagBar}>
              {fusionParams?.dishName ? <View style={[s.tagItem, s.tagItemDish]}><Text style={s.tagText}>🍽 {fusionParams.dishName}</Text></View> : null}
              {fusionParams?.addIngredient ? <View style={s.tagItem}><Text style={s.tagText}>＋ {fusionParams.addIngredient}</Text></View> : null}
              {fusionParams?.cookingTime ? <View style={s.tagItem}><Text style={s.tagText}>⏱ {fusionParams.cookingTime}</Text></View> : null}
            </View>
          ) : null}

          <View style={s.body}>
            <Text style={s.recipeName}>{recipe.name}</Text>
            <Text style={s.recipeDesc}>{recipe.description}</Text>

            {/* Meta chips */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              {recipe.time     && <View style={s.chip}><Text style={s.chipText}>⏱ {recipe.time}</Text></View>}
              {recipe.calories && <View style={s.chip}><Text style={s.chipText}>🔥 {recipe.calories} kcal</Text></View>}
            </View>

            {/* Ingredients */}
            {recipe.ingredients?.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={[s.sectionTitle, { marginBottom: 0 }]}>🥕 材料</Text>
                  {fusionParams?.servings && (
                    <View style={s.servingsBadge}>
                      <Text style={s.servingsText}>👤 {fusionParams.servings}</Text>
                    </View>
                  )}
                </View>

                {/* 食材詳細ヒント */}
                {recipe.ingredients.some(ing => !isCommonIngredient(ing.name)) && (
                  <View style={s.ingHintBanner}>
                    <View style={s.ingHintBadgeSmall}>
                      <Text style={s.ingHintBadgeSmallText}>i</Text>
                    </View>
                    <Text style={s.ingHintBannerText}>気になる食材をタップで詳しく確認できます</Text>
                  </View>
                )}

                {/* まとめて買い物リストに追加 / 解除 */}
                {(() => {
                  const allInCart = recipe.ingredients.every(ing => isInShoppingList(ing.name));
                  return (
                    <TouchableOpacity
                      style={[s.shoppingAllBtn, allInCart && s.shoppingAllBtnActive]}
                      onPress={() => {
                        if (allInCart) {
                          recipe.ingredients.forEach(ing => removeFromShoppingListByName(ing.name));
                          Alert.alert('解除しました', `${recipe.ingredients.length}件の材料を買い物リストから解除しました`);
                        } else {
                          const notInCart = recipe.ingredients.filter(ing => !isInShoppingList(ing.name));
                          addToShoppingList(notInCart, recipe.name);
                          Alert.alert('追加しました', `${notInCart.length}件の材料を買い物リストに追加しました`);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.shoppingAllBtnText, allInCart && s.shoppingAllBtnTextActive]}>
                        {allInCart ? '✓ 材料をまとめて解除' : '🛒 材料をまとめて買い物リストに追加'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}

                {recipe.ingredients.map((ing, i) => {
                  const common = isCommonIngredient(ing.name);
                  const inCart = isInShoppingList(ing.name);
                  return (
                    <TouchableOpacity
                      key={i} style={s.ingRow}
                      onPress={() => !common && openIngredient(ing.name)}
                      activeOpacity={common ? 1 : 0.7}
                    >
                      <Text style={s.ingName}>{ing.name}</Text>
                      <Text style={s.ingAmount}>{ing.amount}</Text>
                      {!common && (
                        <View style={s.ingInfoBadge}>
                          <Text style={s.ingInfoBadgeText}>i</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={[s.ingCartBtn, inCart && s.ingCartBtnActive]}
                        onPress={() => {
                          if (inCart) {
                            removeFromShoppingListByName(ing.name);
                          } else {
                            addToShoppingList([ing], recipe.name);
                          }
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[s.ingCartBtnText, inCart && s.ingCartBtnTextActive]}>
                          {inCart ? '✓' : '＋'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
                <Text style={s.ingHintText}>長押しでチェック</Text>
              </View>
            )}

            {/* Instructions */}
            {recipe.instructions?.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>👨‍🍳 作り方</Text>
                {recipe.instructions.map((step, i) => (
                  <View key={i} style={s.stepRow}>
                    <View style={s.stepNum}>
                      <Text style={s.stepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={s.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Nutrition – 1人前あたり */}
            <View style={s.nutriCard}>
              <Text style={s.nutriPerLabel}>1人前あたり</Text>
              <View style={s.nutriRow}>
                <NutriBadge value={recipe.nutrition?.protein ?? '—'} unit="g" label="タンパク質" color="#4a8020" s={s} />
                <View style={s.divider} />
                <NutriBadge value={recipe.nutrition?.fat ?? '—'}     unit="g" label="脂質"       color="#9040b0" s={s} />
                <View style={s.divider} />
                <NutriBadge value={recipe.nutrition?.carbs ?? '—'}   unit="g" label="炭水化物"   color="#2060c0" s={s} />
                <View style={s.divider} />
                <NutriBadge value={recipe.calories ?? '—'}           unit=""  label="kcal"       color={C.accent} s={s} />
              </View>
            </View>

            {/* エラーカード */}
            {actionError && (
              <View style={s.actionErrorCard}>
                <Text style={s.actionErrorIcon}>
                  {actionError.type === 'timeout' ? '⏱️' : actionError.type === 'network' ? '📵' : '⚠️'}
                </Text>
                <Text style={s.actionErrorMsg}>{actionError.msg}</Text>
                <TouchableOpacity
                  style={s.actionRetryBtn}
                  onPress={() => { setActionError(null); actionError.action(); }}
                  activeOpacity={0.85}
                >
                  <Text style={s.actionRetryText}>🔄 もう一度試す</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tips – ワンポイントアドバイス */}
            {recipe.tips?.length > 0 && (
              <View style={s.tipsCard}>
                <Text style={s.sectionTitle}>💡 ワンポイントアドバイス</Text>
                {recipe.tips.map((tip, i) => (
                  <View key={i} style={s.tipRow}>
                    <View style={s.tipBadge}>
                      <Text style={s.tipBadgeText}>{['①', '②', '③'][i] ?? '+'}</Text>
                    </View>
                    <Text style={s.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AI生成注意 + 報告リンク */}
            <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4, gap: 8 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 17 }}>
                🤖 このレシピはAIが自動生成しました。{'\n'}調理前に内容をご確認ください。
              </Text>
              <TouchableOpacity onPress={handleReport} style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fff5f5' }}>
                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '600' }}>🚩 このレシピを報告</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* 4-button bottom bar: [♡お気に入り][✨アレンジ][🔁再生成][📤シェア] */}
        <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom + 56, 72) }]}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: fav ? '#dc2626' : '#16a34a' }]} onPress={handleFavorite} activeOpacity={0.85}>
            <Text style={s.actionBtnEmoji}>{fav ? '💔' : '♡'}</Text>
            <Text style={s.actionBtnText}>{fav ? '削除' : 'お気に入り'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ea580c' }]} onPress={handleArrange} activeOpacity={0.85}>
            <Text style={s.actionBtnEmoji}>✨</Text>
            <Text style={s.actionBtnText}>アレンジ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#7c3aed' }]} onPress={handleRegenerate} activeOpacity={0.85}>
            <Text style={s.actionBtnEmoji}>🔁</Text>
            <Text style={s.actionBtnText}>再生成</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#0891b2' }, shareLoading && { opacity: 0.7 }]}
            onPress={handleShare}
            disabled={shareLoading}
            activeOpacity={0.85}
          >
            {shareLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.actionBtnEmoji}>📤</Text>
            }
            <Text style={s.actionBtnText}>{shareLoading ? '準備中...' : 'シェア'}</Text>
          </TouchableOpacity>
        </View>

        <BottomNav navigation={navigation} />
      </View>

      {/* ── 食材ポップアップ ───────────────────── */}
      <Modal visible={!!ingModal} transparent animationType="fade" onRequestClose={() => setIngModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setIngModal(null)}>
          <TouchableOpacity activeOpacity={1} style={s.modalCard} onPress={() => {}}>

            {/* 閉じるボタン（右上） */}
            <TouchableOpacity style={s.modalCloseX} onPress={() => setIngModal(null)}>
              <Text style={s.modalCloseXTxt}>✕</Text>
            </TouchableOpacity>

            {/* 食材写真：珍しい食材のみ表示 */}
            {ingInfo?.rarity !== 'common' && ingInfo?.imageUrl && !ingImgError ? (
              <Image
                source={{ uri: ingInfo.imageUrl }}
                style={s.modalImg}
                resizeMode="cover"
                onError={() => setIngImgError(true)}
              />
            ) : ingLoading ? (
              <View style={s.modalImgPlaceholder}>
                <Text style={s.modalImgEmoji}>🥬</Text>
                <Text style={s.modalImgPlaceholderTxt}>読み込み中…</Text>
              </View>
            ) : null}

            {/* 食材名 + レア度バッジ */}
            <View style={s.modalNameRow}>
              <Text style={s.modalName}>{ingModal?.name}</Text>
              {ingInfo?.rarity === 'rare' && (
                <View style={s.modalRarityBadgeRare}>
                  <Text style={s.modalRarityText}>🌟 珍しい食材</Text>
                </View>
              )}
              {ingInfo?.rarity === 'uncommon' && (
                <View style={s.modalRarityBadge}>
                  <Text style={s.modalRarityText}>🔸 やや珍しい</Text>
                </View>
              )}
            </View>

            {ingLoading ? (
              <ActivityIndicator color={C.primary} style={{ marginVertical: 16 }} />
            ) : ingInfo ? (
              <>
                {/* 説明文 */}
                <Text style={s.modalDesc}>{ingInfo.description}</Text>

                {/* 旬の時期 */}
                {ingInfo.season && (
                  <View style={s.modalInfoRow}>
                    <Text style={s.modalInfoLabel}>🌱 旬</Text>
                    <Text style={s.modalInfoText}>{ingInfo.season}</Text>
                  </View>
                )}

                {/* 代用食材 */}
                {ingInfo.substitute && ingInfo.substitute !== 'null' && (
                  <View style={[s.modalInfoRow, s.modalSubstituteRow]}>
                    <Text style={[s.modalInfoLabel, s.modalSubstituteLabel]}>🔄 代用</Text>
                    <Text style={s.modalInfoText}>{ingInfo.substitute}</Text>
                  </View>
                )}
              </>
            ) : null}

            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setIngModal(null)}>
              <Text style={s.modalCloseTxt}>閉じる</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },

  hero: { height: 240, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  imageLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  imageLoadingText: { color: '#fff', fontSize: 12 },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a3a10', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  heroPlaceholderEmoji: { fontSize: 52 },
  heroPlaceholderTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  heroGenerateBtn: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  heroGenerateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  heroGeneratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroGeneratingText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  // Region bar
  regionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.white, paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder, gap: 10,
  },
  regionItem: {
    backgroundColor: C.cream, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1.5, borderColor: C.primary,
  },
  regionItemText: { fontSize: 14, fontWeight: '700', color: C.primary },
  regionPlus: { fontSize: 20, fontWeight: '700', color: C.textMuted },

  // 汎用タグバー（シングル/旬/PFC/フォト/料理×食材）
  tagBar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    backgroundColor: C.white, paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder, gap: 8,
  },
  tagItem: {
    backgroundColor: C.cream, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: C.primary + '55',
  },
  tagItemSeasonal: { backgroundColor: '#fff7e6', borderColor: '#e08c00' },
  tagItemPfc:      { backgroundColor: '#e8f4ff', borderColor: '#2060c0' },
  tagItemPhoto:    { backgroundColor: '#fff3e0', borderColor: '#b45309' },
  tagItemDish:     { backgroundColor: '#f0f8ee', borderColor: C.primary },
  tagText: { fontSize: 14, fontWeight: '600', color: C.text },

  body: { padding: 16 },
  recipeName: { fontSize: 26, fontWeight: '700', color: C.text, lineHeight: 28, marginBottom: 8 },
  recipeDesc: { fontSize: 15, color: C.textSub, lineHeight: 22, marginBottom: 16 },

  nutriCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  nutriPerLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, textAlign: 'center', letterSpacing: 0.5, marginBottom: 10 },
  nutriRow: { flexDirection: 'row', alignItems: 'center' },
  nutriBadge: { flex: 1, alignItems: 'center' },
  nutriValue: { fontSize: 18, fontWeight: '700' },
  nutriUnit: { fontSize: 11, fontWeight: '400' },
  nutriLabel: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  divider: { width: 1, height: 36, backgroundColor: C.creamBorder },

  chip: { backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  chipText: { fontSize: 12, color: C.textSub },

  section: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginTop: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  servingsBadge: { backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  servingsText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  shoppingAllBtn: {
    backgroundColor: '#f0fdf4', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#86efac',
    paddingVertical: 10, paddingHorizontal: 14,
    alignItems: 'center', marginBottom: 10,
  },
  shoppingAllBtnActive: {
    backgroundColor: '#16a34a', borderColor: '#15803d',
  },
  shoppingAllBtnText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  shoppingAllBtnTextActive: { color: '#fff' },

  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.creamBorder, gap: 8 },
  ingName: { flex: 1, fontSize: 16, color: C.text },
  ingAmount: { fontSize: 15, color: C.textMuted },
  ingInfoHint: { fontSize: 13, color: C.textMuted, opacity: 0.6 },
  ingInfoBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5, borderColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ingInfoBadgeText: { color: '#b45309', fontSize: 11, fontWeight: '800', lineHeight: 13 },

  ingHintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 10,
    borderWidth: 1, borderColor: '#fde68a',
    paddingVertical: 7, paddingHorizontal: 12,
    marginBottom: 10,
  },
  ingHintBadgeSmall: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5, borderColor: '#f59e0b',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ingHintBadgeSmallText: { color: '#b45309', fontSize: 10, fontWeight: '800', lineHeight: 12 },
  ingHintBannerText: { fontSize: 12, fontWeight: '600', color: '#92400e', flex: 1 },
  ingCartBtn: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    alignItems: 'center', justifyContent: 'center',
  },
  ingCartBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  ingCartBtnText: { fontSize: 14, color: '#16a34a', fontWeight: '700', lineHeight: 18 },
  ingCartBtnTextActive: { color: '#fff' },
  ingHintText: { fontSize: 11, color: C.textMuted, marginTop: 6, textAlign: 'center', opacity: 0.6 },

  // Ingredient modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40, alignItems: 'center', overflow: 'hidden',
  },
  // 右上の✕ボタン
  modalCloseX: {
    position: 'absolute', top: 14, right: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 20,
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseXTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // リアル写真（上部全幅）
  modalImg: { width: '100%', height: 220, marginBottom: 0, backgroundColor: C.creamDark },
  modalImgPlaceholder: {
    width: '100%', height: 220, marginBottom: 0,
    backgroundColor: C.creamDark, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  modalImgEmoji: { fontSize: 56 },
  modalImgPlaceholderTxt: { fontSize: 12, color: C.textMuted },
  // 食材名 + レア度
  modalNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 10, paddingHorizontal: 20 },
  modalName: { fontSize: 20, fontWeight: '800', color: C.text, flexShrink: 1 },
  modalRarityBadge: { backgroundColor: '#fff8e1', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  modalRarityBadgeRare: { backgroundColor: '#fef3c7' },
  modalRarityText: { fontSize: 11, color: '#b45309', fontWeight: '700' },
  // 説明文
  modalDesc: { fontSize: 14, color: C.textSub, lineHeight: 22, marginBottom: 14, paddingHorizontal: 20 },
  // 旬・代用の共通行スタイル
  modalInfoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.cream, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8,
    marginHorizontal: 20, alignSelf: 'stretch',
  },
  modalInfoLabel: { fontSize: 12, fontWeight: '700', color: C.primary, minWidth: 44 },
  modalInfoText: { fontSize: 13, color: C.text, flex: 1, lineHeight: 20 },
  modalSubstituteRow: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  modalSubstituteLabel: { color: '#16a34a' },
  modalCloseBtn: {
    marginTop: 18, backgroundColor: C.primary, borderRadius: 50,
    paddingHorizontal: 48, paddingVertical: 13,
  },
  modalCloseTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  tipsCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: C.creamBorder, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tipRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignItems: 'flex-start' },
  tipBadge: { width: 24, height: 24, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  tipBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tipText: { flex: 1, fontSize: 14, color: C.textSub, lineHeight: 22 },

  actionErrorCard: {
    backgroundColor: '#fff1f0', borderRadius: 14,
    borderWidth: 1, borderColor: '#fca5a5',
    padding: 16, alignItems: 'center', gap: 8, marginTop: 14,
  },
  actionErrorIcon: { fontSize: 28 },
  actionErrorMsg: { fontSize: 13, color: '#7f1d1d', textAlign: 'center', lineHeight: 20 },
  actionRetryBtn: {
    backgroundColor: '#dc2626', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 20, marginTop: 4,
  },
  actionRetryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  stepRow: { flexDirection: 'row', gap: 14, marginBottom: 22, alignItems: 'flex-start' },
  stepNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  stepNumText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 16, color: C.text, lineHeight: 26 },

  bottomBar: {
    position: 'absolute', bottom: 56, left: 0, right: 0,
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.creamBorder,
  },
  actionBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  actionBtnEmoji: { fontSize: 18 },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
