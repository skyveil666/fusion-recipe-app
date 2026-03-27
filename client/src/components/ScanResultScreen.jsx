import { useState } from 'react';
import { ChevronLeft, CheckSquare, Square, Loader2 } from 'lucide-react';

const CATEGORIES = ['主菜', '副菜', '汁物', 'おつまみ'];
const SERVINGS    = ['1人前', '2人前', '3人前', '3-4人前'];

export default function ScanResultScreen({
  scanImage, detectedIngredients, setDetectedIngredients,
  params, setParams,
  allergies,
  onRecipeGenerated, onBack,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setParams((p) => ({ ...p, [k]: v }));

  const toggleIngredient = (name) => {
    setDetectedIngredients((prev) =>
      prev.map((i) => (i.name === name ? { ...i, checked: !i.checked } : i))
    );
  };

  const selectedIngredients = detectedIngredients
    .filter((i) => i.checked)
    .map((i) => i.name);

  const generate = async () => {
    if (selectedIngredients.length === 0) {
      setError('少なくとも1つの食材を選択してください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'scan',
          params: {
            ingredients: selectedIngredients,
            category: params.category,
            servings: params.servings,
            allergies,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'レシピの生成に失敗しました');
      onRecipeGenerated(data.recipe);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-cream">
      {/* Image header */}
      <div className="relative" style={{ height: 220 }}>
        {scanImage ? (
          <img src={scanImage} alt="scan" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">画像なし</span>
          </div>
        )}
        {/* Back overlay */}
        <div
          className="absolute inset-0 flex flex-col justify-between p-4"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 50%)' }}
        >
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <span className="text-white font-semibold text-sm drop-shadow">カメラ撮影画面</span>
            <div className="w-9" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Detected ingredients */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-brand text-sm font-semibold">✅ 検出された食材</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">チェックを入れて使用する食材を選択してください</p>

          {detectedIngredients.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-2">食材が検出されませんでした</p>
          ) : (
            <ul className="space-y-2">
              {detectedIngredients.map((ing) => (
                <li key={ing.name}>
                  <button
                    onClick={() => toggleIngredient(ing.name)}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    {ing.checked ? (
                      <CheckSquare size={20} className="text-brand shrink-0" />
                    ) : (
                      <Square size={20} className="text-gray-300 shrink-0" />
                    )}
                    <span className={`text-sm ${ing.checked ? 'text-gray-800' : 'text-gray-400'}`}>
                      {ing.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Category */}
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => set('category', cat)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                params.category === cat
                  ? 'text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 bg-white'
              }`}
              style={params.category === cat ? { backgroundColor: '#3a5a18' } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Servings */}
        <div>
          <p className="text-xs text-gray-500 mb-2 font-medium">人前設定</p>
          <div className="flex gap-2">
            {SERVINGS.map((s) => (
              <button
                key={s}
                onClick={() => set('servings', s)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  params.servings === s
                    ? 'text-white shadow-sm'
                    : 'border border-gray-200 text-gray-600 bg-white'
                }`}
                style={params.servings === s ? { backgroundColor: '#3a5a18' } : {}}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Allergy info */}
        {allergies.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <span className="text-sm">⚠️</span>
            <p className="text-xs text-amber-700">
              除外食材: <strong>{allergies.join('、')}</strong>
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
          disabled={loading || selectedIngredients.length === 0}
          className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-md disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: '#3a5a18' }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              生成中...
            </>
          ) : (
            'レシピを作成する'
          )}
        </button>
      </div>
    </div>
  );
}
