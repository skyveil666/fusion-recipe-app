import { Heart, Trash2, Clock, Flame } from 'lucide-react';

const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=70',
  'https://images.unsplash.com/photo-1555126634-323283e090fa?w=200&q=70',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&q=70',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=70',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=70',
];

function pickImage(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return FOOD_IMAGES[hash % FOOD_IMAGES.length];
}

export default function FavoritesScreen({ favorites, onViewRecipe, onRemove }) {
  return (
    <div className="min-h-full bg-cream">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-cream-border">
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-red-500 fill-red-500" />
          <h1 className="text-xl font-bold text-gray-800">お気に入り</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1">{favorites.length} 件のレシピ</p>
      </div>

      <div className="px-4 pt-4 pb-6 space-y-3">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Heart size={48} className="text-gray-200" />
            <p className="text-gray-400 text-sm text-center">
              まだお気に入りがありません<br />レシピを生成してお気に入りに追加しましょう
            </p>
          </div>
        ) : (
          favorites.map((recipe) => (
            <div
              key={recipe.name + recipe.savedAt}
              className="bg-white rounded-2xl overflow-hidden shadow-sm flex"
            >
              {/* Thumbnail */}
              <div className="w-24 shrink-0">
                <img
                  src={pickImage(recipe.name)}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Info */}
              <div className="flex-1 p-3 flex flex-col justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
                    {recipe.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {recipe.time && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} /> {recipe.time}
                      </span>
                    )}
                    {recipe.calories && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Flame size={11} /> {recipe.calories} kcal
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => onViewRecipe(recipe)}
                    className="text-xs font-medium text-brand border border-brand rounded-lg px-3 py-1 active:scale-95 transition-all"
                  >
                    レシピを見る
                  </button>
                  <button
                    onClick={() => onRemove(recipe.name)}
                    className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
