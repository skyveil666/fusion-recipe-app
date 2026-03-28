import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { COUNTRIES_BY_REGION, JAPAN_MUNICIPALITIES } from '../constants';

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
  { id: '北海道',     emoji: '⛄', bg: '#e0f2fe', border: '#7dd3fc',
    prefectures: ['北海道'] },
  { id: '東北',       emoji: '🍎', bg: '#fef2f2', border: '#fca5a5',
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

// ── メインコンポーネント ───────────────────────────────────
export default function MapSelectModal({ visible, onClose, onSelect }) {
  const [mode,       setMode]       = useState(null);   // 'world' | 'japan'
  const [bigRegion,  setBigRegion]  = useState(null);   // 世界大地域
  const [japanReg,   setJapanReg]   = useState(null);   // 日本地方
  const [prefecture, setPrefecture] = useState(null);   // 都道府県
  const [finalVal,   setFinalVal]   = useState(null);   // 確定値
  const [step,       setStep]       = useState(0);
  // 0: world/japan, 1: region, 2: country/pref, 3: municipality(japan), 4: slot

  const reset = () => {
    setMode(null); setBigRegion(null); setJapanReg(null);
    setPrefecture(null); setFinalVal(null); setStep(0);
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
    else if (step === 3) { setPrefecture(null); setStep(2); }
    else if (step === 4) {
      setFinalVal(null);
      if (mode === 'japan' && prefecture) {
        setStep(getMunis(prefecture).length > 0 ? 3 : 2);
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

  // 世界: 大地域の国リスト
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

  // 都道府県の市町村
  const municipalities = prefecture ? getMunis(prefecture) : [];

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
          <Text style={s.modeSub}>都道府県から選ぶ</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ── STEP 1: 大地域 / 日本地方 ──────────────────────────
  const renderStep1 = () => {
    const regions = mode === 'world' ? WORLD_BIG_REGIONS : JAPAN_REGIONS;
    return (
      <>
        <Text style={s.stepTitle}>
          {mode === 'world' ? '地域を選んでください' : '地方を選んでください'}
        </Text>
        <View style={s.regionGrid}>
          {regions.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[s.regionCard, { backgroundColor: r.bg, borderColor: r.border }]}
              onPress={() => {
                if (mode === 'world') { setBigRegion(r.id); }
                else { setJapanReg(r.id); }
                setStep(2);
              }}
              activeOpacity={0.85}
            >
              <Text style={s.regionEmoji}>{r.emoji}</Text>
              <Text style={s.regionName}>{r.id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  };

  // ── STEP 2: 国選択 (世界) / 都道府県選択 (日本) ─────────
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
    } else {
      return (
        <>
          <Text style={s.stepTitle}>{japanReg}の都道府県を選んでください</Text>
          <View style={s.chipGrid}>
            {japanPrefs.map(pref => {
              const munis = getMunis(pref);
              return (
                <TouchableOpacity
                  key={pref}
                  style={[s.chip, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}
                  onPress={() => {
                    setPrefecture(pref);
                    if (munis.length > 0) { setStep(3); }
                    else { setFinalVal(pref); setStep(4); }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.chipText}>{pref}</Text>
                  {munis.length > 0 && (
                    <Text style={s.chipSub}>{munis.length}地域あり ›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      );
    }
  };

  // ── STEP 3: 市町村選択 (日本のみ) ─────────────────────
  const renderStep3 = () => (
    <>
      <Text style={s.stepTitle}>{prefecture}の地域を選んでください</Text>
      {/* 都道府県全体ボタン */}
      <TouchableOpacity
        style={s.prefAllBtn}
        onPress={() => { setFinalVal(prefecture); setStep(4); }}
        activeOpacity={0.85}
      >
        <Text style={s.prefAllText}>📍 {prefecture}全体を選ぶ</Text>
      </TouchableOpacity>
      <View style={s.chipGrid}>
        {municipalities.map(m => {
          const display = m.replace(prefecture, '');
          return (
            <TouchableOpacity
              key={m}
              style={[s.chip, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}
              onPress={() => { setFinalVal(m); setStep(4); }}
              activeOpacity={0.85}
            >
              <Text style={[s.chipText, { fontSize: 12 }]}>{display}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

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
                style={[
                  s.dot,
                  step > i && s.dotDone,
                  step === i && s.dotActive,
                ]}
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
    paddingBottom: 0,
    maxHeight: '92%',
  },

  // ヘッダー
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd0bc',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  backText: { fontSize: 14, fontWeight: '600', color: '#3a5a18', minWidth: 52 },
  closeText: { fontSize: 20, color: '#aaaaaa', minWidth: 28, textAlign: 'right', lineHeight: 24 },

  // ステップドット
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd0bc' },
  dotActive: { width: 24, backgroundColor: '#3a5a18', borderRadius: 4 },
  dotDone: { backgroundColor: '#86d65a' },

  scrollContent: { padding: 16, paddingBottom: 44, gap: 0 },

  // ステップ共通
  stepTitle: {
    fontSize: 16, fontWeight: '700', color: '#1a1a1a',
    textAlign: 'center', marginBottom: 6,
  },
  stepSub: {
    fontSize: 11, color: '#aaaaaa',
    textAlign: 'center', marginBottom: 10,
  },

  // STEP 0: モード選択
  modeRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modeCard: {
    flex: 1, borderRadius: 18, borderWidth: 2.5,
    padding: 22, alignItems: 'center', gap: 6,
  },
  modeEmoji: { fontSize: 40 },
  modeName: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  modeSub: { fontSize: 12, color: '#555', textAlign: 'center' },

  // STEP 1: 地域グリッド (2カラム)
  regionGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12,
  },
  regionCard: {
    width: '47%', borderRadius: 14, borderWidth: 2,
    paddingVertical: 16, paddingHorizontal: 8,
    alignItems: 'center', gap: 5,
  },
  regionEmoji: { fontSize: 30 },
  regionName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },

  // STEP 2-3: チップグリッド
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: '#ffffff',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#ddd0bc',
    paddingHorizontal: 14, paddingVertical: 9,
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  chipSub: { fontSize: 10, color: '#86efac', marginTop: 2 },

  // STEP 3: 都道府県全体ボタン
  prefAllBtn: {
    backgroundColor: '#3a5a18', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginTop: 10, marginBottom: 4,
  },
  prefAllText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // STEP 4: スロット選択
  selectedPreview: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#ddd0bc',
    paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', marginTop: 10, marginBottom: 18,
    gap: 4,
  },
  selectedPreviewLabel: { fontSize: 11, color: '#aaaaaa' },
  selectedPreviewValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  slotRow: { flexDirection: 'row', gap: 12 },
  slotBtn: {
    flex: 1, borderRadius: 16,
    paddingVertical: 20, alignItems: 'center', gap: 4,
  },
  slotNum: { fontSize: 32, fontWeight: '800', color: '#fff' },
  slotLabel: { fontSize: 13, color: '#fff', fontWeight: '600' },
});
