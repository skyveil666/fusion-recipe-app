import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { COUNTRIES_BY_REGION, JAPAN_MUNICIPALITIES, JAPAN_MAJOR_CITIES } from '../constants';

// ── 世界の大地域定義 ──────────────────────────────────────
const WORLD_BIG_REGIONS = [
  { id: 'アジア',     emoji: '🌏', bg: '#e0f2fe', border: '#7dd3fc',
    subRegions: ['東アジア', '東南アジア', '南アジア', '中央西アジア'] },
  { id: 'ヨーロッパ', emoji: '🏰', bg: '#ede9fe', border: '#c4b5fd',
    subRegions: ['西欧', '北欧', '東欧バルカン'] },
  { id: '北米',       emoji: '🗽', bg: '#fef9c3', border: '#fde047',
    subRegions: ['北米', 'カリブ中米'] },
  { id: '南米',       emoji: '🌿', bg: '#dcfce7', border: '#86efac',
    subRegions: ['南米'] },
  { id: 'アフリカ',   emoji: '🌍', bg: '#fff7ed', border: '#fdba74',
    subRegions: ['北アフリカ', 'サブサハラ'] },
  { id: 'オセアニア', emoji: '🦘', bg: '#fdf4ff', border: '#e879f9',
    subRegions: ['オセアニア'] },
  { id: '中東',       emoji: '🕌', bg: '#fef2f2', border: '#fca5a5',
    subRegions: ['中東'] },
];

// ── 日本の地方定義 ────────────────────────────────────────
const JAPAN_REGIONS = [
  { id: '北海道',     emoji: '⛄', bg: '#dbeafe', border: '#93c5fd',
    prefectures: ['北海道'] },
  { id: '東北',       emoji: '🍎', bg: '#fce7f3', border: '#f9a8d4',
    prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
  { id: '関東・甲信', emoji: '🗼', bg: '#fef9c3', border: '#fde047',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '山梨県', '長野県'] },
  { id: '中部・北陸', emoji: '🗻', bg: '#fff7ed', border: '#fdba74',
    prefectures: ['新潟県', '富山県', '石川県', '福井県', '岐阜県', '静岡県', '愛知県', '三重県'] },
  { id: '近畿',       emoji: '⛩️', bg: '#fdf4ff', border: '#e879f9',
    prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
  { id: '中国・四国', emoji: '🏯', bg: '#ede9fe', border: '#c4b5fd',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'] },
  { id: '九州・沖縄', emoji: '🌺', bg: '#dcfce7', border: '#86efac',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
];

function getMunis(pref) {
  return JAPAN_MUNICIPALITIES.filter(m => m.startsWith(pref));
}

// ── 地方ブロック（地図風ボタン）─────────────────────────
function BlockButton({ region, onPress, style }) {
  return (
    <TouchableOpacity
      style={[s.blockBtn, { backgroundColor: region.bg, borderColor: region.border }, style]}
      onPress={() => onPress(region.id)}
      activeOpacity={0.8}
    >
      <Text style={s.blockEmoji}>{region.emoji}</Text>
      <Text style={s.blockName}>{region.id}</Text>
    </TouchableOpacity>
  );
}

// ── 日本ブロック地図（地理的レイアウト）────────────────────
function JapanBlockMap({ onSelect }) {
  const get = (id) => JAPAN_REGIONS.find(r => r.id === id);
  return (
    <View style={s.japanMap}>
      {/* 北海道: 右上 */}
      <View style={s.mapRow}>
        <View style={{ flex: 1 }} />
        <BlockButton region={get('北海道')} onPress={onSelect} style={{ flex: 1.4 }} />
      </View>
      {/* 東北: やや右 */}
      <View style={s.mapRow}>
        <View style={{ flex: 0.4 }} />
        <BlockButton region={get('東北')} onPress={onSelect} style={{ flex: 2 }} />
      </View>
      {/* 中部北陸 + 関東甲信: 中段 */}
      <View style={s.mapRow}>
        <BlockButton region={get('中部・北陸')} onPress={onSelect} style={{ flex: 1 }} />
        <BlockButton region={get('関東・甲信')} onPress={onSelect} style={{ flex: 1.4 }} />
      </View>
      {/* 近畿: 左寄り */}
      <View style={s.mapRow}>
        <BlockButton region={get('近畿')} onPress={onSelect} style={{ flex: 1.4 }} />
        <View style={{ flex: 1 }} />
      </View>
      {/* 中国四国: 左寄り */}
      <View style={s.mapRow}>
        <BlockButton region={get('中国・四国')} onPress={onSelect} style={{ flex: 1.8 }} />
        <View style={{ flex: 0.6 }} />
      </View>
      {/* 九州沖縄: 左端 */}
      <View style={s.mapRow}>
        <BlockButton region={get('九州・沖縄')} onPress={onSelect} style={{ flex: 1.5 }} />
        <View style={{ flex: 0.9 }} />
      </View>
    </View>
  );
}

// ── メインコンポーネント ───────────────────────────────────
export default function MapSelectModal({ visible, onClose, onSelect }) {
  const [mode,          setMode]          = useState(null);   // 'world' | 'japan'
  const [bigRegion,     setBigRegion]     = useState(null);
  const [japanReg,      setJapanReg]      = useState(null);
  const [prefecture,    setPrefecture]    = useState(null);
  const [finalVal,      setFinalVal]      = useState(null);
  const [step,          setStep]          = useState(0);
  const [showMoreMunis, setShowMoreMunis] = useState(false);
  // step: 0=world/japan, 1=region, 2=country/pref, 3=municipality, 4=slot

  const reset = () => {
    setMode(null); setBigRegion(null); setJapanReg(null);
    setPrefecture(null); setFinalVal(null); setStep(0);
    setShowMoreMunis(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const goBack = () => {
    if (step <= 0) { handleClose(); return; }
    if (step === 1) { setMode(null); setStep(0); }
    else if (step === 2) {
      if (mode === 'world') setBigRegion(null);
      else setJapanReg(null);
      setStep(1);
    }
    else if (step === 3) {
      setPrefecture(null);
      setShowMoreMunis(false);
      setStep(2);
    }
    else if (step === 4) {
      setFinalVal(null);
      if (mode === 'japan' && prefecture) {
        const hasMajor = (JAPAN_MAJOR_CITIES[prefecture] || []).length > 0;
        const hasMunis = getMunis(prefecture).length > 0;
        setStep(hasMajor || hasMunis ? 3 : 2);
      } else {
        setStep(2);
      }
    }
  };

  const confirmSlot = (slot) => {
    onSelect(finalVal, slot);
    reset();
    onClose();
  };

  // 世界: 選択地域の国リスト
  const worldCountries = bigRegion
    ? [...new Set(
        (WORLD_BIG_REGIONS.find(r => r.id === bigRegion)?.subRegions || [])
          .flatMap(sub => COUNTRIES_BY_REGION[sub] || [])
      )]
    : [];

  // 日本: 選択地方の都道府県
  const japanPrefs = japanReg
    ? (JAPAN_REGIONS.find(r => r.id === japanReg)?.prefectures || [])
    : [];

  // 都道府県の rural 市町村
  const ruralMunis = prefecture ? getMunis(prefecture) : [];

  // ── STEP 0: 世界 / 日本 ────────────────────────────────
  const renderStep0 = () => (
    <>
      <Text style={s.stepTitle}>どこの料理を選びますか？</Text>
      <View style={s.modeRow}>
        <TouchableOpacity
          style={[s.modeCard, { borderColor: '#7dd3fc', backgroundColor: '#e0f2fe' }]}
          onPress={() => { setMode('world'); setStep(1); }}
          activeOpacity={0.85}
        >
          <Text style={s.modeEmoji}>🌍</Text>
          <Text style={s.modeName}>世界</Text>
          <Text style={s.modeSub}>海外の国から選ぶ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeCard, { borderColor: '#86efac', backgroundColor: '#dcfce7' }]}
          onPress={() => { setMode('japan'); setStep(1); }}
          activeOpacity={0.85}
        >
          <Text style={s.modeEmoji}>🗾</Text>
          <Text style={s.modeName}>日本</Text>
          <Text style={s.modeSub}>市区町村まで選べる</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── STEP 1: 大地域 / 日本ブロック地図 ───────────────────
  const renderStep1 = () => {
    if (mode === 'world') {
      return (
        <>
          <Text style={s.stepTitle}>地域を選んでください</Text>
          <View style={s.regionGrid}>
            {WORLD_BIG_REGIONS.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[s.regionCard, { backgroundColor: r.bg, borderColor: r.border }]}
                onPress={() => { setBigRegion(r.id); setStep(2); }}
                activeOpacity={0.85}
              >
                <Text style={s.regionEmoji}>{r.emoji}</Text>
                <Text style={s.regionName}>{r.id}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }

    // 日本: ブロック地図
    return (
      <>
        <Text style={s.stepTitle}>地方を選んでください</Text>
        <Text style={s.stepSub}>タップすると都道府県・市区町村まで選べます</Text>
        <JapanBlockMap
          onSelect={(id) => { setJapanReg(id); setStep(2); }}
        />
      </>
    );
  };

  // ── STEP 2: 国選択(世界) / 都道府県選択(日本) ─────────
  const renderStep2 = () => {
    if (mode === 'world') {
      const regionData = WORLD_BIG_REGIONS.find(r => r.id === bigRegion);
      return (
        <>
          <Text style={s.stepTitle}>{bigRegion}の国を選んでください</Text>
          <Text style={s.stepSub}>{regionData?.subRegions.join(' ・ ')}</Text>
          <View style={s.chipGrid}>
            {worldCountries.map(c => (
              <TouchableOpacity
                key={c}
                style={s.chip}
                onPress={() => { setFinalVal(c); setStep(4); }}
                activeOpacity={0.85}
              >
                <Text style={s.chipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      );
    }

    // 都道府県選択
    return (
      <>
        <Text style={s.stepTitle}>{japanReg}の都道府県を選んでください</Text>
        <View style={s.prefGrid}>
          {japanPrefs.map(pref => {
            const hasMajor = (JAPAN_MAJOR_CITIES[pref] || []).length > 0;
            const hasMunis = getMunis(pref).length > 0;
            return (
              <TouchableOpacity
                key={pref}
                style={[s.prefCard, { backgroundColor: JAPAN_REGIONS.find(r => r.prefectures.includes(pref))?.bg || '#fff', borderColor: JAPAN_REGIONS.find(r => r.prefectures.includes(pref))?.border || '#ddd' }]}
                onPress={() => {
                  setPrefecture(pref);
                  if (hasMajor || hasMunis) { setStep(3); }
                  else { setFinalVal(pref); setStep(4); }
                }}
                activeOpacity={0.85}
              >
                <Text style={s.prefCardText}>{pref}</Text>
                {hasMajor && <Text style={s.prefCardSub}>市区町村 ›</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  };

  // ── STEP 3: 市区町村選択(日本のみ) ────────────────────
  const renderStep3 = () => {
    const majorCities = JAPAN_MAJOR_CITIES[prefecture] || [];

    return (
      <>
        <Text style={s.stepTitle}>{prefecture}</Text>
        <Text style={s.stepSub}>市区町村を選んでください</Text>

        {/* 都道府県全体ボタン */}
        <TouchableOpacity
          style={s.prefAllBtn}
          onPress={() => { setFinalVal(prefecture); setStep(4); }}
          activeOpacity={0.85}
        >
          <Text style={s.prefAllText}>📍 {prefecture}全体を選ぶ</Text>
        </TouchableOpacity>

        {/* 主要な市区町村 */}
        {majorCities.length > 0 && (
          <>
            <Text style={s.cityGroupLabel}>🏙️ 主要な市区町村</Text>
            <View style={s.cityGrid}>
              {majorCities.map(city => (
                <TouchableOpacity
                  key={city}
                  style={s.cityCard}
                  onPress={() => { setFinalVal(`${prefecture}${city}`); setStep(4); }}
                  activeOpacity={0.85}
                >
                  <Text style={s.cityCardText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* もっと見る（rural municipalities） */}
        {ruralMunis.length > 0 && (
          <>
            <TouchableOpacity
              style={s.moreBtn}
              onPress={() => setShowMoreMunis(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={s.moreBtnText}>
                {showMoreMunis ? '▲ 閉じる' : `▼ その他の地域・集落 (${ruralMunis.length}件)`}
              </Text>
            </TouchableOpacity>
            {showMoreMunis && (
              <View style={s.chipGrid}>
                {ruralMunis.map(m => {
                  const display = m.replace(prefecture, '');
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[s.chip, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}
                      onPress={() => { setFinalVal(m); setStep(4); }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.chipText}>{display}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </>
    );
  };

  // ── STEP 4: スロット選択 ───────────────────────────────
  const renderStep4 = () => (
    <>
      <Text style={s.stepTitle}>どちらの欄に入れますか？</Text>
      <View style={s.selectedPreview}>
        <Text style={s.selectedPreviewLabel}>選択した地域</Text>
        <Text style={s.selectedPreviewValue}>📍 {finalVal}</Text>
      </View>
      <View style={s.slotRow}>
        <TouchableOpacity
          style={[s.slotBtn, { backgroundColor: '#3a5a18' }]}
          onPress={() => confirmSlot(1)}
          activeOpacity={0.85}
        >
          <Text style={s.slotNum}>①</Text>
          <Text style={s.slotLabel}>入力欄 ①</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.slotBtn, { backgroundColor: '#1d4ed8' }]}
          onPress={() => confirmSlot(2)}
          activeOpacity={0.85}
        >
          <Text style={s.slotNum}>②</Text>
          <Text style={s.slotLabel}>入力欄 ②</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderContent = () => {
    if (step === 0) return renderStep0();
    if (step === 1) return renderStep1();
    if (step === 2) return renderStep2();
    if (step === 3) return renderStep3();
    if (step === 4) return renderStep4();
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        <View style={s.modal}>

          {/* ヘッダー */}
          <View style={s.header}>
            {step > 0 ? (
              <TouchableOpacity onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.backText}>‹ 戻る</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 52 }} />
            )}
            <Text style={s.headerTitle}>🗺️ 地図から選ぶ</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ステップドット */}
          <View style={s.dotRow}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[s.dot, step > i && s.dotDone, step === i && s.dotActive]}
              />
            ))}
          </View>

          {/* コンテンツ */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderContent()}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#f8f2e6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },

  // ヘッダー
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#ddd0bc',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  backText:    { fontSize: 14, fontWeight: '600', color: '#3a5a18', minWidth: 52 },
  closeText:   { fontSize: 20, color: '#aaaaaa', minWidth: 28, textAlign: 'right', lineHeight: 24 },

  // ステップドット
  dotRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 10,
  },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd0bc' },
  dotActive: { width: 24, backgroundColor: '#3a5a18', borderRadius: 4 },
  dotDone:   { backgroundColor: '#86d65a' },

  scrollContent: { padding: 16, paddingBottom: 44 },

  // 共通
  stepTitle: {
    fontSize: 16, fontWeight: '700', color: '#1a1a1a',
    textAlign: 'center', marginBottom: 4,
  },
  stepSub: {
    fontSize: 11, color: '#aaaaaa',
    textAlign: 'center', marginBottom: 8,
  },

  // STEP 0: モード選択
  modeRow:  { flexDirection: 'row', gap: 12, marginTop: 10 },
  modeCard: {
    flex: 1, borderRadius: 18, borderWidth: 2.5,
    padding: 22, alignItems: 'center', gap: 6,
  },
  modeEmoji: { fontSize: 40 },
  modeName:  { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  modeSub:   { fontSize: 12, color: '#555', textAlign: 'center' },

  // STEP 1 世界: 地域グリッド
  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  regionCard: {
    width: '47%', borderRadius: 14, borderWidth: 2,
    paddingVertical: 16, paddingHorizontal: 8,
    alignItems: 'center', gap: 5,
  },
  regionEmoji: { fontSize: 30 },
  regionName:  { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },

  // STEP 1 日本: ブロック地図
  japanMap: { gap: 6, marginTop: 10 },
  mapRow:   { flexDirection: 'row', gap: 6 },
  blockBtn: {
    borderWidth: 2, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    gap: 3, minHeight: 64,
  },
  blockEmoji: { fontSize: 22 },
  blockName:  { fontSize: 11, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },

  // STEP 2 日本: 都道府県グリッド
  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  prefCard: {
    borderWidth: 2, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'center', minWidth: '30%', flex: 1,
  },
  prefCardText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  prefCardSub:  { fontSize: 10, color: '#3a5a18', fontWeight: '600', marginTop: 2 },

  // STEP 2 世界: チップグリッド
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: '#ffffff',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd0bc',
    paddingHorizontal: 14, paddingVertical: 9,
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },

  // STEP 3: 都道府県全体ボタン
  prefAllBtn: {
    backgroundColor: '#3a5a18', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 10, marginBottom: 14,
  },
  prefAllText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // STEP 3: 主要市区町村
  cityGroupLabel: {
    fontSize: 12, fontWeight: '700', color: '#3a5a18',
    marginBottom: 8,
  },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14, borderWidth: 2, borderColor: '#ddd0bc',
    paddingHorizontal: 14, paddingVertical: 12,
    alignItems: 'center', minWidth: '30%', flex: 1,
  },
  cityCardText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },

  // STEP 3: もっと見るボタン
  moreBtn: {
    marginTop: 14, marginBottom: 4,
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12, borderWidth: 1, borderColor: '#86efac',
    alignItems: 'center',
  },
  moreBtnText: { fontSize: 13, fontWeight: '600', color: '#3a5a18' },

  // STEP 4: スロット選択
  selectedPreview: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ddd0bc',
    paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', marginTop: 10, marginBottom: 18, gap: 4,
  },
  selectedPreviewLabel: { fontSize: 11, color: '#aaaaaa' },
  selectedPreviewValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  slotRow: { flexDirection: 'row', gap: 12 },
  slotBtn: {
    flex: 1, borderRadius: 16,
    paddingVertical: 20, alignItems: 'center', gap: 4,
  },
  slotNum:   { fontSize: 32, fontWeight: '800', color: '#fff' },
  slotLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
});
