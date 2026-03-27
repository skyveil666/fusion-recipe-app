import { useState } from 'react';
import { X, Plus, ShieldCheck } from 'lucide-react';

const COMMON_ALLERGENS = [
  { id: '小麦', label: '小麦・グルテン', emoji: '🌾' },
  { id: '乳製品', label: '乳製品',         emoji: '🥛' },
  { id: '卵',   label: '卵',               emoji: '🥚' },
  { id: '甲殻類', label: '甲殻類（エビ・カニ）', emoji: '🦐' },
  { id: '落花生', label: '落花生（ピーナッツ）', emoji: '🥜' },
  { id: 'ナッツ', label: '木の実（ナッツ類）',   emoji: '🌰' },
  { id: '魚介類', label: '魚介類',          emoji: '🐟' },
  { id: '大豆',  label: '大豆',             emoji: '🫘' },
  { id: '豚肉',  label: '豚肉',             emoji: '🐷' },
  { id: '牛肉',  label: '牛肉',             emoji: '🐄' },
];

export default function SettingsScreen({ allergies, setAllergies }) {
  const [custom, setCustom] = useState('');

  const toggleAllergen = (id) => {
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
    <div className="min-h-full bg-cream">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-cream-border">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand" />
          <h1 className="text-xl font-bold text-gray-800">設定</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1">アレルギー・除外食材を設定してください</p>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Active exclusions summary */}
        {allergies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ 現在の除外設定</p>
            <div className="flex flex-wrap gap-2">
              {allergies.map((a) => (
                <span
                  key={a}
                  className="flex items-center gap-1 bg-amber-100 border border-amber-200 rounded-full px-3 py-1 text-xs text-amber-800"
                >
                  {a}
                  <button onClick={() => remove(a)}>
                    <X size={11} className="text-amber-500" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Common allergens */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">よくあるアレルゲン</p>
          <div className="space-y-2">
            {COMMON_ALLERGENS.map(({ id, label, emoji }) => {
              const active = allergies.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleAllergen(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                    active
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{emoji}</span>
                    <span className={`text-sm font-medium ${active ? 'text-red-700' : 'text-gray-700'}`}>
                      {label}
                    </span>
                  </div>
                  {/* Toggle indicator */}
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      active ? 'border-red-400 bg-red-400' : 'border-gray-300'
                    }`}
                  >
                    {active && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom exclusions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">その他の除外食材</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="例）パクチー、セロリ..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand bg-gray-50"
            />
            <button
              onClick={addCustom}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium shrink-0 flex items-center gap-1"
              style={{ backgroundColor: '#3a5a18' }}
            >
              <Plus size={14} />
              追加
            </button>
          </div>

          {customAllergies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customAllergies.map((a) => (
                <span
                  key={a}
                  className="flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-sm text-red-700"
                >
                  {a}
                  <button onClick={() => remove(a)}>
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="bg-brand/10 border border-brand/20 rounded-2xl p-4">
          <p className="text-xs text-brand leading-relaxed">
            ℹ️ 設定した食材はレシピ生成時に自動的に除外されます。
            アレルギーや苦手な食材を登録することで、安全で美味しいレシピを提案します。
          </p>
        </div>
      </div>
    </div>
  );
}
