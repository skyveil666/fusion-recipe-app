import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Switch, Modal, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, useTheme } from '../AppContext';
import BottomNav from '../components/BottomNav';
import { COMMON_ALLERGENS } from '../constants';

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { allergies, setAllergies, darkMode, setDarkMode, dislikes, setDislikes, avoidMethods, setAvoidMethods } = useApp();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [custom, setCustom] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const toggle = (id) => {
    setAllergies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const addCustom = () => {
    const v = custom.trim();
    if (v && !allergies.includes(v)) {
      setAllergies((p) => [...p, v]);
      setCustom('');
    }
  };

  const remove = (a) => setAllergies((p) => p.filter((x) => x !== a));

  const customAllergies = allergies.filter(
    (a) => !COMMON_ALLERGENS.find((c) => c.id === a)
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#2d5a1b' }}>
    <View style={[s.screen, { flex: 1, marginTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>⚙️ 設定</Text>
        <Text style={s.headerSub}>アレルギー・除外食材・調理法を設定</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ダークモード */}
        <View style={s.card}>
          <View style={s.darkModeRow}>
            <View style={{ gap: 2 }}>
              <Text style={s.sectionTitle}>🌙 ダークモード</Text>
              <Text style={s.darkModeDesc}>
                {darkMode ? '暗い背景テーマを使用中' : '明るい背景テーマを使用中'}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#d1d5db', true: C.primary }}
              thumbColor={C.white}
            />
          </View>
        </View>

        {/* Active summary */}
        {allergies.length > 0 && (
          <View style={s.activeCard}>
            <Text style={s.activeTitle}>⚠️ 現在の除外設定</Text>
            <View style={s.tagWrap}>
              {allergies.map((a) => (
                <TouchableOpacity key={a} style={s.activeTag} onPress={() => remove(a)}>
                  <Text style={s.activeTagText}>{a} ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Common allergens */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>よくあるアレルゲン</Text>
          {COMMON_ALLERGENS.map(({ id, label, emoji }) => {
            const active = allergies.includes(id);
            return (
              <TouchableOpacity
                key={id}
                style={[s.allergenRow, active && s.allergenRowActive]}
                onPress={() => toggle(id)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  <Text style={[s.allergenLabel, active && s.allergenLabelActive]}>{label}</Text>
                </View>
                <View style={[s.checkCircle, active && s.checkCircleActive]}>
                  {active && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>その他の除外食材</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={custom}
              onChangeText={setCustom}
              onSubmitEditing={addCustom}
              placeholder="例）パクチー、セロリ..."
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addBtn} onPress={addCustom}>
              <Text style={s.addBtnText}>＋ 追加</Text>
            </TouchableOpacity>
          </View>
          {customAllergies.length > 0 && (
            <View style={[s.tagWrap, { marginTop: 12 }]}>
              {customAllergies.map((a) => (
                <TouchableOpacity key={a} style={s.customTag} onPress={() => remove(a)}>
                  <Text style={s.customTagText}>{a} ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Dislikes */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>😞 嫌いな食材</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={dislikeInput}
              onChangeText={setDislikeInput}
              onSubmitEditing={() => {
                const v = dislikeInput.trim();
                if (v && !dislikes.includes(v)) { setDislikes(p => [...p, v]); setDislikeInput(''); }
              }}
              placeholder="例）ピーマン、納豆、パクチー..."
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addBtn} onPress={() => {
              const v = dislikeInput.trim();
              if (v && !dislikes.includes(v)) { setDislikes(p => [...p, v]); setDislikeInput(''); }
            }}>
              <Text style={s.addBtnText}>＋ 追加</Text>
            </TouchableOpacity>
          </View>
          {dislikes.length > 0 && (
            <View style={[s.tagWrap, { marginTop: 12 }]}>
              {dislikes.map((a) => (
                <TouchableOpacity key={a} style={s.dislikeTag} onPress={() => setDislikes(p => p.filter(x => x !== a))}>
                  <Text style={s.dislikeTagText}>{a} ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Avoid methods */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>🚫 避けたい調理法・条件</Text>
          <View style={[s.tagWrap, { marginBottom: 10 }]}>
            {['揚げ物', '生もの', '辛いもの', 'アルコール', 'オーブン'].map(m => {
              const active = avoidMethods.includes(m);
              return (
                <TouchableOpacity
                  key={m}
                  style={[s.avoidChip, active && s.avoidChipActive]}
                  onPress={() => setAvoidMethods(prev => active ? prev.filter(x => x !== m) : [...prev, m])}
                >
                  <Text style={[s.avoidChipText, active && s.avoidChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={avoidInput}
              onChangeText={setAvoidInput}
              onSubmitEditing={() => {
                const v = avoidInput.trim();
                if (v && !avoidMethods.includes(v)) { setAvoidMethods(p => [...p, v]); setAvoidInput(''); }
              }}
              placeholder="その他（例: 長時間煮込み）"
              placeholderTextColor={C.textMuted}
              returnKeyType="done"
            />
            <TouchableOpacity style={s.addBtn} onPress={() => {
              const v = avoidInput.trim();
              if (v && !avoidMethods.includes(v)) { setAvoidMethods(p => [...p, v]); setAvoidInput(''); }
            }}>
              <Text style={s.addBtnText}>＋ 追加</Text>
            </TouchableOpacity>
          </View>
          {avoidMethods.filter(m => !['揚げ物', '生もの', '辛いもの', 'アルコール', 'オーブン'].includes(m)).length > 0 && (
            <View style={[s.tagWrap, { marginTop: 12 }]}>
              {avoidMethods.filter(m => !['揚げ物', '生もの', '辛いもの', 'アルコール', 'オーブン'].includes(m)).map((a) => (
                <TouchableOpacity key={a} style={s.avoidChipActive} onPress={() => setAvoidMethods(p => p.filter(x => x !== a))}>
                  <Text style={s.avoidChipTextActive}>{a} ×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <Text style={s.infoText}>
            ℹ️ アレルギー食材は必ず除外されます。嫌いな食材・避けたい調理法はできるだけ除外されます。設定はレシピ生成時に自動的に反映されます。
          </Text>
        </View>

        {/* 注意事項・免責事項 */}
        <TouchableOpacity style={s.disclaimerCard} onPress={() => setShowDisclaimer(true)} activeOpacity={0.85}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ gap: 4 }}>
              <Text style={s.disclaimerTitle}>📋 注意事項・免責事項</Text>
              <Text style={s.disclaimerSub}>AI生成について・安全な使い方</Text>
            </View>
            <Text style={{ fontSize: 18, color: C.textMuted }}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Disclaimer Modal */}
      <Modal
        visible={showDisclaimer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <View style={[s.modalContainer, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>📋 注意事項・免責事項</Text>
            <TouchableOpacity onPress={() => setShowDisclaimer(false)} style={s.modalClose}>
              <Text style={s.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>

            {/* AI生成について */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>🤖 AI生成について</Text>
              <Text style={s.modalText}>
                このアプリのレシピはすべてAI（人工知能）により自動で作成されています。{'\n\n'}
                材料・分量・調理時間・手順・栄養情報などに、まれに不自然な内容や誤りが含まれる場合があります。{'\n\n'}
                レシピ内容は参考情報としてご利用ください。
              </Text>
            </View>

            {/* 調理と安全 */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>🍳 調理と安全について</Text>
              <Text style={s.modalText}>
                調理前に材料・分量・手順をご自身で確認してください。{'\n\n'}
                加熱時間、味付け、保存方法などは食材の状態や調理環境に合わせてご判断ください。{'\n\n'}
                特に生もの・肉類の加熱には十分ご注意ください。
              </Text>
            </View>

            {/* アレルギー・体調 */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>⚠️ アレルギー・体調について</Text>
              <Text style={s.modalText}>
                食物アレルギーや持病、食事制限がある場合は、必ず食材表示や専門家のアドバイスを優先してください。{'\n\n'}
                アプリのアレルギー除外設定はAIへの指示に基づくもので、完全な除外を保証するものではありません。{'\n\n'}
                アレルギーが重篤な方は、生成されたレシピの内容を必ずご自身で確認してからお使いください。
              </Text>
            </View>

            {/* 栄養情報 */}
            <View style={s.modalSection}>
              <Text style={s.modalSectionTitle}>📊 栄養情報について</Text>
              <Text style={s.modalText}>
                表示されるカロリーや栄養素（PFC比率など）はAIによる推定値です。{'\n\n'}
                食材の産地・鮮度・調理方法により実際の値と異なる場合があります。{'\n\n'}
                医療・ダイエット目的での利用には、専門家にご相談ください。
              </Text>
            </View>

            {/* レシピを報告 */}
            <View style={[s.modalSection, { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1 }]}>
              <Text style={[s.modalSectionTitle, { color: '#c2410c' }]}>🚩 おかしなレシピを見つけたら</Text>
              <Text style={[s.modalText, { color: '#7c2d12' }]}>
                危険・不適切・明らかに間違いのあるレシピを見つけた場合は、レシピ画面の「報告」ボタンからお知らせください。{'\n\n'}
                内容を確認のうえ改善に役立てます。
              </Text>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </Modal>

      <BottomNav navigation={navigation} />
    </View>
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  header: {
    backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.creamBorder,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  scroll: { padding: 16, gap: 12 },

  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },

  darkModeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkModeDesc: { fontSize: 12, color: C.textMuted },

  activeCard: {
    backgroundColor: C.darkMode ? '#2a2000' : '#fffbeb',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#fde68a',
  },
  activeTitle: { fontSize: 13, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activeTag: {
    backgroundColor: '#fef3c7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#fde68a',
  },
  activeTagText: { fontSize: 12, color: '#92400e', fontWeight: '500' },

  sectionTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 12 },

  allergenRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6,
    backgroundColor: C.cream, borderWidth: 1, borderColor: C.creamBorder,
  },
  allergenRowActive: { backgroundColor: '#fff0f0', borderColor: '#fca5a5' },
  allergenLabel: { fontSize: 14, color: C.text },
  allergenLabelActive: { color: '#b91c1c', fontWeight: '500' },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.creamBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },

  input: {
    borderWidth: 1, borderColor: C.creamBorder, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: C.cream, color: C.text,
  },
  addBtn: {
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  customTag: {
    backgroundColor: '#fee2e2', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  customTagText: { fontSize: 12, color: '#b91c1c' },

  dislikeTag: {
    backgroundColor: '#dcfce7', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#86efac',
  },
  dislikeTagText: { fontSize: 12, color: '#166534', fontWeight: '500' },

  avoidChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: C.cream, borderWidth: 1, borderColor: C.creamBorder,
  },
  avoidChipText: { fontSize: 13, color: C.text },
  avoidChipActive: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd',
  },
  avoidChipTextActive: { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },

  infoCard: {
    backgroundColor: `${C.primary}22`, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: `${C.primary}44`,
  },
  infoText: { fontSize: 12, color: C.primary, lineHeight: 20 },

  disclaimerCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: C.creamBorder,
  },
  disclaimerTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  disclaimerSub: { fontSize: 12, color: C.textMuted },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#f9f6f0' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  modalClose: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 10 },
  modalCloseText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  modalScroll: { padding: 20, gap: 12 },
  modalSection: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    gap: 8,
  },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  modalText: { fontSize: 14, color: '#4b5563', lineHeight: 22 },
});
