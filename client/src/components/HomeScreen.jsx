export default function HomeScreen({ onFusionClick, onScanClick }) {
  return (
    <div className="relative h-full min-h-screen flex flex-col" style={{ background: '#1a2f0a' }}>
      {/* Background food image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=480&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.45,
        }}
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(20,38,8,0.6) 0%, rgba(20,38,8,0.85) 60%, rgba(15,28,5,0.97) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-6 py-10">
        {/* Brand */}
        <div className="flex items-center gap-3 mt-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            🌍
          </div>
          <div>
            <p className="text-white/60 text-xs tracking-widest uppercase">フュージョン料理 with</p>
            <h1 className="text-white text-2xl font-bold tracking-wide leading-tight">
              Fusion Recipe
            </h1>
          </div>
        </div>
        <p className="text-white/40 text-xs mt-1 ml-0.5 tracking-wider">All World Cooking</p>

        {/* Center illustration */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div
            className="w-52 h-52 rounded-full overflow-hidden border-4 shadow-2xl"
            style={{ borderColor: 'rgba(255,255,255,0.25)' }}
          >
            <img
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&q=80"
              alt="fusion food"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="text-center px-4">
            <p className="text-white/80 text-base font-medium leading-relaxed">
              世界2カ国の料理を掛け合わせた
            </p>
            <p className="text-white/80 text-base font-medium">
              オリジナルレシピを AI が生成
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pb-6">
          <button
            onClick={onFusionClick}
            className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: '#c87820' }}
          >
            フュージョン料理を作る
          </button>
          <button
            onClick={onScanClick}
            className="w-full py-4 rounded-2xl font-bold text-white text-base border-2 active:scale-95 transition-transform"
            style={{ borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)' }}
          >
            スキャンでレシピ
          </button>
        </div>
      </div>
    </div>
  );
}
