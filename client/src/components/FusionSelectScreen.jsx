import { useState } from 'react';
import { ChevronLeft, Shuffle, Star, X, Plus, Loader2 } from 'lucide-react';

const COUNTRIES = [
  '日本', 'イタリア', 'フランス', 'スペイン', 'ギリシャ', 'トルコ',
  'メキシコ', 'ブラジル', 'ペルー', 'アメリカ', 'カナダ',
  'タイ', '中国', '韓国', 'ベトナム', 'インド', 'インドネシア',
  'モロッコ', 'エチオピア', 'レバノン', 'イスラエル',
  'ドイツ', 'イギリス', 'ポーランド', 'ロシア',
  'アルゼンチン', 'コロンビア',
];

const PFC_PRESETS = [
  { label: '高たんぱく', p: 40, f: 25, c: 35 },
  { label: 'バランス',   p: 30, f: 25, c: 45 },
  { label: '低糖質',     p: 35, f: 40, c: 25 },
];

const CATEGORIES = ['主菜', '副菜', '汁物', 'おつまみ'];
const SERVINGS    = ['1人前', '2-3人前', '3-4人前'];

function SectionCard({ emoji, title, children }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{emoji}</span>
        <span className="font-semibold text-gray-700 text-sm">{title}</span>
      </div>
      {children}
    </div>
  );
}

function PillGroup({ options, value, onChange, accent }) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              active ? 'text-white shadow-sm' : 'border border-gray-200 text-gray-600 bg-white'
            }`}
            style={active ? { backgroundColor: accent || '#3a5a18' } : {}}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CountryInput({ label, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const filtered = COUNTRIES.filter((c) =>
    value ? c.toLowerCase().includes(value.toLowerCase()) : true
  ).slice(0, 8);

  return (
    <div className="relative mb-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex gap-2 items-stretch">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => { onChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand bg-gray-50"
          />
          {open && (
            <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto mt-1 scrollbar-hide">
              {filtered.map((c) => (
                <li key={c}>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-cream"
                    onMouseDown={() => { onChange(c); setOpen(false); }}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="px-2.5 py-2.5 bg-gray-100 rounded-xl text-xs text-gray-500 flex items-center gap-1 shrink-0">
          <Star size={13} />
          <span className="hidden xs:inline">お気に入り</span>
        </button>
      </div>
    </div>
  );
}

export default function FusionSelectScreen({ params, setParams, allergies, onRecipeGenerated, onBack }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [newIng, setNewIng]   = useState('');

  const set = (k, v) => setParams((p) => ({ ...p, [k]: v }));
  const setPfc = (k, v) => setParams((p) => ({ ...p, pfc: { ...p.pfc, [k]: v } }));

  const randomize = () => {
    const shuffled = [...COUNTRIES].sort(() => Math.random() - 0.5);
    setParams((p) => ({ ...p, country1: shuffled[0], country2: shuffled[1] }));
  };

  const addIngredient = () => {
    const v = newIng.trim();
    if (v && !params.ingredients.includes(v)) {
      set('ingredients', [...params.ingredients, v]);
      setNewIng('');
    }
  };

  const removeIngredient = (ing) => set('ingredients', params.ingredients.filter((i) => i !== ing));

  const generate = async () => {
    if (!params.country1 || !params.country2) {
      setError('2つの国／地域を選択してください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fusion', params: { ...params, allergies } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
      onRecipeGenerated(data.recipe);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-cream pt-10 pb-3 px-4 border-b border-cream-border">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onBack} className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <span className="text-xs text-gray-400 font-medium">WorldRecipe</span>
          <div className="w-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">世界の味を発見しよう</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          2つの国や地域を選んで、ユニークなフュージョンレシピを作成
        </p>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Country */}
        <SectionCard emoji="🌍" title="国や地域を選択">
          <CountryInput
            label="①国や地域入力"
            value={params.country1}
            onChange={(v) => set('country1', v)}
            placeholder="例）日本、イタリア…"
          />
          <CountryInput
            label="②国や地域入力"
            value={params.country2}
            onChange={(v) => set('country2', v)}
            placeholder="例）メキシコ、タイ…"
          />
          <button
            onClick={randomize}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <Shuffle size={15} />
            ランダム2カ国を選ぶ
          </button>
        </SectionCard>

        {/* PFC */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <span className="font-semibold text-gray-700 text-sm">PFCバランス設定</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{params.isPfcEnabled ? 'ON' : 'OFF'}</span>
              <button
                onClick={() => set('isPfcEnabled', !params.isPfcEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  params.isPfcEnabled ? 'bg-brand' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    params.isPfcEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {params.isPfcEnabled && (
            <div className="fade-in space-y-3">
              {/* Presets */}
              <div className="flex gap-2">
                {PFC_PRESETS.map((pr) => (
                  <button
                    key={pr.label}
                    onClick={() => setParams((p) => ({ ...p, pfc: { p: pr.p, f: pr.f, c: pr.c } }))}
                    className="flex-1 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    {pr.label}
                  </button>
                ))}
              </div>

              {/* Sliders */}
              {[
                { k: 'p', label: 'タンパク質 (P)', color: '#4a8020' },
                { k: 'f', label: '脂質 (F)',       color: '#9040b0' },
                { k: 'c', label: '炭水化物 (C)',   color: '#2060c0' },
              ].map(({ k, label, color }) => (
                <div key={k}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{params.pfc[k]}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={params.pfc[k]}
                    onChange={(e) => setPfc(k, +e.target.value)}
                    className="w-full h-1.5 rounded-lg cursor-pointer"
                    style={{ accentColor: color, background: `linear-gradient(to right, ${color} ${params.pfc[k]}%, #e5e7eb ${params.pfc[k]}%)` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingredients */}
        <SectionCard emoji="🥬" title="食材入力">
          <p className="text-xs text-gray-400 mb-2">使いたい食材を入力してください</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newIng}
              onChange={(e) => setNewIng(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              placeholder="例）トマト、鶏肉..."
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand bg-gray-50"
            />
            <button
              onClick={addIngredient}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium shrink-0"
              style={{ backgroundColor: '#3a5a18' }}
            >
              追加
            </button>
          </div>
          {params.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {params.ingredients.map((ing) => (
                <span
                  key={ing}
                  className="flex items-center gap-1 px-3 py-1 bg-cream rounded-full text-sm text-gray-700 border border-cream-border"
                >
                  {ing}
                  <button onClick={() => removeIngredient(ing)}>
                    <X size={12} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Servings */}
        <SectionCard emoji="👥" title="人前設定">
          <PillGroup options={SERVINGS} value={params.servings} onChange={(v) => set('servings', v)} />
        </SectionCard>

        {/* Category */}
        <SectionCard emoji="🍽️" title="料理カテゴリー">
          <PillGroup options={CATEGORIES} value={params.category} onChange={(v) => set('category', v)} />
        </SectionCard>

        {/* Allergy indicator */}
        {allergies.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <span className="text-sm">⚠️</span>
            <p className="text-xs text-amber-700">
              除外食材: <strong>{allergies.join('、')}</strong> はレシピから除外されます
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Generate */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-md disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: '#3a5a18' }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              生成中...
            </>
          ) : (
            'レシピを生成する'
          )}
        </button>
      </div>
    </div>
  );
}
