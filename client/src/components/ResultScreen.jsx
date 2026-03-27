import { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Share2, CheckSquare, Square, Clock, Flame } from 'lucide-react';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=480&q=80',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=480&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=480&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=480&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=480&q=80',
];

function pickFallback(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

export default function ResultScreen({ recipe, isFavorite, onToggleFavorite, onBack, onHome }) {
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [genImage, setGenImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (!recipe) return;
    setGenImage(null);
    setImageLoading(true);
    fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeName: recipe.name, description: recipe.description }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.imageBase64) setGenImage(d.imageBase64); })
      .catch(() => {})
      .finally(() => setImageLoading(false));
  }, [recipe?.name]);

  if (!recipe) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        レシピが見つかりません
      </div>
    );
  }

  const toggleIng = (name) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const foodImg = genImage || pickFallback(recipe.name);

  return (
    <div className="min-h-full bg-cream fade-in">
      {/* Hero image */}
      <div className="relative" style={{ height: 240 }}>
        <img src={foodImg} alt={recipe.name} className="w-full h-full object-cover" />
        {imageLoading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-xs">画像生成中...</span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 60%)' }}
        />
        {/* Top buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-10">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.45)' }}
            >
              <Share2 size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-24 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{recipe.name}</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{recipe.description}</p>
        </div>

        {/* Nutrition bar */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
          <NutriBadge color="#4a8020" value={recipe.nutrition?.protein ?? '—'} unit="g" label="タンパク質" />
          <div className="w-px h-10 bg-gray-100" />
          <NutriBadge color="#9040b0" value={recipe.nutrition?.fat ?? '—'} unit="g" label="脂質" />
          <div className="w-px h-10 bg-gray-100" />
          <NutriBadge color="#2060c0" value={recipe.nutrition?.carbs ?? '—'} unit="g" label="炭水化物" />
          <div className="w-px h-10 bg-gray-100" />
          <NutriBadge color="#c87820" value={recipe.calories ?? '—'} unit="" label="kcal" />
        </div>

        {/* Meta chips */}
        <div className="flex gap-3">
          {recipe.time && (
            <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm">
              <Clock size={14} className="text-brand" />
              <span className="text-sm text-gray-700 font-medium">{recipe.time}</span>
            </div>
          )}
          {recipe.calories && (
            <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm">
              <Flame size={14} className="text-accent" />
              <span className="text-sm text-gray-700 font-medium">{recipe.calories} kcal</span>
            </div>
          )}
        </div>

        {/* Ingredients */}
        {recipe.ingredients?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-3">
              🥕 材料（{recipe.ingredients.length}品）
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, i) => {
                const checked = checkedIngredients.has(ing.name);
                return (
                  <li key={i}>
                    <button
                      onClick={() => toggleIng(ing.name)}
                      className="flex items-center justify-between w-full"
                    >
                      <div className="flex items-center gap-3">
                        {checked ? (
                          <CheckSquare size={18} className="text-brand shrink-0" />
                        ) : (
                          <Square size={18} className="text-gray-300 shrink-0" />
                        )}
                        <span
                          className={`text-sm ${checked ? 'line-through text-gray-300' : 'text-gray-700'}`}
                        >
                          {ing.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">{ing.amount}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 text-sm mb-3">👨‍🍳 作り方</h2>
            <ol className="space-y-3">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: '#3a5a18' }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Fixed bottom bar */}
      <div
        className="absolute bottom-16 left-0 right-0 px-4 py-3 bg-white border-t border-cream-border flex gap-3"
        style={{ zIndex: 40 }}
      >
        <button
          onClick={onToggleFavorite}
          className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
            isFavorite
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Heart
            size={20}
            className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}
          />
        </button>
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-xl font-bold text-white text-sm active:scale-95 transition-all"
          style={{ backgroundColor: '#c87820' }}
        >
          お気に入りに追加
        </button>
      </div>
    </div>
  );
}

function NutriBadge({ color, value, unit, label }) {
  return (
    <div className="flex-1 text-center">
      <p className="font-bold text-base" style={{ color }}>
        {value}<span className="text-xs font-normal ml-0.5">{unit}</span>
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
