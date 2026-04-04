import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const TASTE_CONFIG = [
  { key: 'sweetness', label: '甘さ',    emoji: '🍯', options: ['ひかえめ', 'ふつう', '甘め'],      defaultVal: 'ふつう' },
  { key: 'spiciness', label: '辛さ',    emoji: '🌶️', options: ['なし', 'ひかえめ', 'しっかり'],   defaultVal: 'なし'   },
  { key: 'sourness',  label: '酸味',    emoji: '🍋', options: ['なし', '少し', 'しっかり'],         defaultVal: 'なし'   },
  { key: 'richness',  label: '味の濃さ', emoji: '🍲', options: ['あっさり', 'ふつう', 'しっかり'], defaultVal: 'ふつう' },
];

export const DEFAULT_TASTE_PREFS = Object.fromEntries(
  TASTE_CONFIG.map(({ key, defaultVal }) => [key, defaultVal])
);

/**
 * 味の好みカード（折りたたみ式・任意設定）
 *
 * Props:
 *   value       - null = 閉じた状態, object = { sweetness, spiciness, sourness, richness }
 *   onChange    - (newValue: null | object) => void
 *   accentColor - アクティブチップの色（各画面のテーマ色）
 */
export default function TastePreferenceCard({ value, onChange, accentColor = '#3a5a18' }) {
  const isOpen = value !== null && value !== undefined;

  const handleToggle = () => {
    onChange(isOpen ? null : { ...DEFAULT_TASTE_PREFS });
  };

  const handleChip = (key, opt) => {
    onChange({ ...value, [key]: opt });
  };

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.header} onPress={handleToggle} activeOpacity={0.75}>
        <View style={s.headerLeft}>
          <Text style={s.headerEmoji}>🎨</Text>
          <View>
            <Text style={s.headerTitle}>味の好み（任意）</Text>
            <Text style={s.headerSub}>
              {isOpen ? '設定中 — タップして閉じる' : 'タップして味を調整する'}
            </Text>
          </View>
        </View>
        <Text style={[s.chevron, { color: accentColor }]}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={s.body}>
          {TASTE_CONFIG.map(({ key, label, emoji, options }) => (
            <View key={key} style={s.row}>
              <Text style={s.rowLabel}>{emoji} {label}</Text>
              <View style={s.chips}>
                {options.map((opt) => {
                  const active = value[key] === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        s.chip,
                        active
                          ? { backgroundColor: accentColor, borderColor: accentColor }
                          : s.chipOff,
                      ]}
                      onPress={() => handleChip(key, opt)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  headerSub: { fontSize: 11, color: '#888', marginTop: 1 },
  chevron: { fontSize: 12, fontWeight: '700' },
  body: { marginTop: 14, gap: 12 },
  row: { gap: 6 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#444' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  chipOff: {
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
});
