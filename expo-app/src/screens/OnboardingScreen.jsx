import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🌍',
    title: 'ようこそ！\nフュージョンレシピへ',
    desc: '世界中の料理を組み合わせたオリジナルレシピを\nAIが自動で作成します。\n新しい味との出会いを楽しんでください！',
    bg: '#2d5a1b',
    accent: '#4a8020',
  },
  {
    emoji: '✏️',
    title: '2つの国や地域を\n選ぶだけ',
    desc: '日本×メキシコ、長野×インドなど\n好きな地域を自由に組み合わせ。\nランダム選択ボタンで驚きの組み合わせも！',
    bg: '#1a3a7a',
    accent: '#2554a8',
  },
  {
    emoji: '✨',
    title: 'AIがまるごと\n考えてくれる！',
    desc: 'タイトル・材料・作り方・栄養情報まで\nAIがすべて生成。\nお気に入り保存・友達へのシェアもできます。',
    bg: '#6b21a8',
    accent: '#9333ea',
  },
];

const COMMON_ALLERGENS = [
  { id: '卵', emoji: '🥚' }, { id: '乳', emoji: '🥛' },
  { id: '小麦', emoji: '🌾' }, { id: 'えび', emoji: '🦐' },
  { id: 'かに', emoji: '🦀' }, { id: '落花生', emoji: '🥜' },
  { id: 'そば', emoji: '🍜' }, { id: '木の実類', emoji: '🌰' },
];

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { setHasSeenOnboarding, setAllergies, setDislikes, setAvoidMethods } = useApp();
  const [idx, setIdx] = useState(0); // 0-2 = slides, 3 = food setup
  const scrollRef = useRef(null);

  // Food setup state
  const [selectedAllergens, setSelectedAllergens] = useState([]);
  const [customAllergen, setCustomAllergen] = useState('');
  const [dislikeInput, setDislikeInput] = useState('');
  const [dislikes, setDislikesLocal] = useState([]);
  const [avoidInput, setAvoidInput] = useState('');
  const [avoidList, setAvoidList] = useState([]);

  const goTo = (i) => {
    if (i <= 2) {
      scrollRef.current?.scrollTo({ x: i * width, animated: true });
    }
    setIdx(i);
  };

  const toggleAllergen = (id) => {
    setSelectedAllergens(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const addCustomAllergen = () => {
    const v = customAllergen.trim();
    if (v && !selectedAllergens.includes(v)) {
      setSelectedAllergens(prev => [...prev, v]);
      setCustomAllergen('');
    }
  };

  const addDislike = () => {
    const v = dislikeInput.trim();
    if (v && !dislikes.includes(v)) {
      setDislikesLocal(prev => [...prev, v]);
      setDislikeInput('');
    }
  };

  const addAvoid = () => {
    const v = avoidInput.trim();
    if (v && !avoidList.includes(v)) {
      setAvoidList(prev => [...prev, v]);
      setAvoidInput('');
    }
  };

  const finish = (skipFood) => {
    if (!skipFood) {
      setAllergies(selectedAllergens);
      setDislikes(dislikes);
      setAvoidMethods(avoidList);
    }
    setHasSeenOnboarding(true);
    navigation.replace('Home');
  };

  const isLast = idx === SLIDES.length - 1;

  // Food setup screen (step 4)
  if (idx === 3) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={s.foodScroll} showsVerticalScrollIndicator={false}>
          <Text style={s.foodTitle}>🍽️ 食の安全設定</Text>
          <Text style={s.foodSub}>ここで設定した食材はレシピから自動で除外されます{'\n'}あとから設定画面でいつでも変更できます</Text>

          {/* Allergies */}
          <View style={s.foodCard}>
            <Text style={s.foodSectionTitle}>⚠️ アレルギー食材（最重要）</Text>
            <Text style={s.foodSectionSub}>選んだ食材はすべてのレシピから必ず除外されます</Text>
            <View style={s.chipRow}>
              {COMMON_ALLERGENS.map(({ id, emoji }) => {
                const active = selectedAllergens.includes(id);
                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => toggleAllergen(id)}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{emoji} {id}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.inputRow}>
              <TextInput
                style={s.foodInput}
                value={customAllergen}
                onChangeText={setCustomAllergen}
                onSubmitEditing={addCustomAllergen}
                placeholder="その他（例: キウイ、もも）"
                placeholderTextColor="#999"
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addBtn} onPress={addCustomAllergen}>
                <Text style={s.addBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
            {selectedAllergens.filter(a => !COMMON_ALLERGENS.find(c => c.id === a)).length > 0 && (
              <View style={s.chipRow}>
                {selectedAllergens.filter(a => !COMMON_ALLERGENS.find(c => c.id === a)).map(a => (
                  <TouchableOpacity key={a} style={s.chipActive} onPress={() => setSelectedAllergens(p => p.filter(x => x !== a))}>
                    <Text style={s.chipTextActive}>{a} ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Dislikes */}
          <View style={s.foodCard}>
            <Text style={s.foodSectionTitle}>😞 嫌いな食材</Text>
            <Text style={s.foodSectionSub}>できるだけレシピから除外します</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.foodInput}
                value={dislikeInput}
                onChangeText={setDislikeInput}
                onSubmitEditing={addDislike}
                placeholder="例: ピーマン、納豆、パクチー"
                placeholderTextColor="#999"
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addBtn} onPress={addDislike}>
                <Text style={s.addBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
            {dislikes.length > 0 && (
              <View style={s.chipRow}>
                {dislikes.map(a => (
                  <TouchableOpacity key={a} style={s.chipGreen} onPress={() => setDislikesLocal(p => p.filter(x => x !== a))}>
                    <Text style={s.chipGreenText}>{a} ×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Avoid methods */}
          <View style={s.foodCard}>
            <Text style={s.foodSectionTitle}>🚫 避けたい調理法・条件</Text>
            <Text style={s.foodSectionSub}>できるだけレシピから除外します</Text>
            <View style={s.chipRow}>
              {['揚げ物', '生もの', '辛いもの', 'アルコール', 'オーブン'].map(m => {
                const active = avoidList.includes(m);
                return (
                  <TouchableOpacity key={m} style={[s.chip, active && s.chipBlue]} onPress={() => {
                    setAvoidList(prev => active ? prev.filter(x => x !== m) : [...prev, m]);
                  }}>
                    <Text style={[s.chipText, active && s.chipBlueText]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.inputRow}>
              <TextInput
                style={s.foodInput}
                value={avoidInput}
                onChangeText={setAvoidInput}
                onSubmitEditing={addAvoid}
                placeholder="その他（例: 長時間煮込み）"
                placeholderTextColor="#999"
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addBtn} onPress={addAvoid}>
                <Text style={s.addBtnText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 10, paddingBottom: Math.max(insets.bottom, 20) }}>
            <TouchableOpacity style={s.startBtn} onPress={() => finish(false)}>
              <Text style={s.startBtnText}>✅ 設定して始める</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.skipFoodBtn} onPress={() => finish(true)}>
              <Text style={s.skipFoodText}>すべて該当なし・スキップ</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[s.slide, { width, backgroundColor: slide.bg }]}>
            <Text style={s.emoji}>{slide.emoji}</Text>
            <Text style={s.title}>{slide.title}</Text>
            <Text style={s.desc}>{slide.desc}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={s.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.dot, i === idx && s.dotActive]} />
          ))}
        </View>

        <View style={s.btnRow}>
          {idx > 0 && (
            <TouchableOpacity style={s.backBtn} onPress={() => goTo(idx - 1)}>
              <Text style={s.backText}>‹ 戻る</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.nextBtn, idx === 0 && { flex: 1 }]}
            onPress={() => goTo(idx + 1)}
            activeOpacity={0.85}
          >
            <Text style={s.nextText}>
              {isLast ? '食の設定へ ›' : '次へ ›'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isLast && (
          <TouchableOpacity style={s.skipBtn} onPress={() => goTo(3)}>
            <Text style={s.skipText}>スキップ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a3a10' },

  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 28,
  },
  emoji: { fontSize: 88, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 38 },
  desc: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },

  bottom: { backgroundColor: '#1a3a10', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 24 },
  btnRow: { flexDirection: 'row', gap: 10 },
  backBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#2d5a1b', fontSize: 16, fontWeight: '800' },
  skipBtn: { alignSelf: 'center', paddingVertical: 8 },
  skipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  // Food setup
  foodScroll: { padding: 20, gap: 16, paddingTop: 10 },
  foodTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  foodSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },
  foodCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  foodSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  foodSectionSub: { fontSize: 12, color: '#6b7280' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipText: { fontSize: 13, color: '#374151' },
  chipActive: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  chipTextActive: { fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  chipGreen: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  chipGreenText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  chipBlue: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#93c5fd' },
  chipBlueText: { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 8 },
  foodInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, backgroundColor: '#f9fafb', color: '#111' },
  addBtn: { backgroundColor: '#2d5a1b', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  startBtn: { backgroundColor: '#2d5a1b', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  skipFoodBtn: { alignSelf: 'center', paddingVertical: 10 },
  skipFoodText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
});
