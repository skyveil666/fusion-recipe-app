import { useRef, useState } from 'react';
import { Camera, ChevronLeft, Loader2, ImagePlus } from 'lucide-react';

const CATEGORIES = ['主菜', '副菜', '汁物', 'おつまみ'];
const SERVINGS    = ['1人前', '2人前', '3人前', '5人前'];

export default function ScanScreen({
  params, setParams,
  scanImage, setScanImage, setScanMediaType,
  detectedIngredients, setDetectedIngredients,
  allergies,
  onDetected,
  onBack,
}) {
  const fileRef     = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [gallery, setGallery] = useState([]); // previous thumbnails

  const set = (k, v) => setParams((p) => ({ ...p, [k]: v }));

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setScanImage(dataUrl);
      setScanMediaType(file.type || 'image/jpeg');
      setGallery((prev) => [dataUrl, ...prev].slice(0, 5));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const detect = async () => {
    if (!scanImage) {
      setError('写真を撮影またはアップロードしてください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Strip data URL prefix → pure base64
      const base64 = scanImage.split(',')[1];
      const mediaType = scanImage.split(';')[0].replace('data:', '') || 'image/jpeg';

      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '食材の検出に失敗しました');

      // Build checked-ingredient objects
      setDetectedIngredients(
        data.ingredients.map((name) => ({ name, checked: true }))
      );
      onDetected();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col" style={{ background: '#1e2e10' }}>
      {/* Top bar */}
      <div className="flex items-center px-4 pt-10 pb-3">
        <button onClick={onBack} className="p-1 -ml-1 mr-2">
          <ChevronLeft size={22} className="text-white/70" />
        </button>
        <h2 className="text-white font-semibold text-base">カメラ撮影画面</h2>
      </div>

      {/* Camera / image preview */}
      <div
        className="mx-4 rounded-2xl overflow-hidden relative"
        style={{ height: 220, background: '#0e1a06', border: '2px solid rgba(255,255,255,0.1)' }}
      >
        {scanImage ? (
          <img src={scanImage} alt="scan" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-white/30">
            <ImagePlus size={40} />
            <p className="text-sm">写真を撮影またはアップロード</p>
          </div>
        )}
        {/* Upload / Camera button overlay */}
        <button
          onClick={() => fileRef.current?.click()}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
        >
          <Camera size={18} className="text-white" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* Gallery */}
      <div className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/70 text-sm font-medium">撮影した写真</p>
          {gallery.length > 0 && (
            <button className="text-white/50 text-xs">すべて表示</button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {gallery.map((img, i) => (
            <button
              key={i}
              onClick={() => setScanImage(img)}
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                img === scanImage ? 'border-white' : 'border-transparent opacity-70'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          {/* Add photo button */}
          <button
            onClick={() => fileRef.current?.click()}
            className="shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '2px dashed rgba(255,255,255,0.3)' }}
          >
            <Camera size={22} className="text-white/60" />
          </button>
        </div>
      </div>

      {/* Settings area */}
      <div
        className="flex-1 mt-4 rounded-t-3xl px-4 pt-4 pb-6 space-y-4"
        style={{ background: '#f8f2e6' }}
      >
        {/* Category */}
        <div>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => set('category', cat)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  params.category === cat
                    ? 'text-white shadow-sm'
                    : 'border border-gray-300 text-gray-600 bg-white'
                }`}
                style={params.category === cat ? { backgroundColor: '#3a5a18' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Servings */}
        <div>
          <div className="flex gap-2">
            {SERVINGS.map((s) => (
              <button
                key={s}
                onClick={() => set('servings', s)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  params.servings === s
                    ? 'text-white shadow-sm'
                    : 'border border-gray-300 text-gray-600 bg-white'
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

        {/* Generate button */}
        <button
          onClick={detect}
          disabled={loading || !scanImage}
          className="w-full py-4 rounded-2xl font-bold text-white text-base shadow-md disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: '#3a5a18' }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              食材を検出中...
            </>
          ) : (
            'レシピを生成する'
          )}
        </button>
      </div>
    </div>
  );
}
