import { useState, useEffect } from 'react';
import HomeScreen from './components/HomeScreen';
import FusionSelectScreen from './components/FusionSelectScreen';
import ScanScreen from './components/ScanScreen';
import ScanResultScreen from './components/ScanResultScreen';
import ResultScreen from './components/ResultScreen';
import FavoritesScreen from './components/FavoritesScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';

const INITIAL_FUSION = {
  country1: '',
  country2: '',
  isPfcEnabled: false,
  pfc: { p: 30, f: 25, c: 45 },
  ingredients: [],
  servings: '2人前',
  category: '主菜',
};

const INITIAL_SCAN = {
  category: '主菜',
  servings: '2人前',
};

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export default function App() {
  const [screen, setScreen]               = useState('home');
  const [prevScreen, setPrevScreen]       = useState('home');
  const [recipeResult, setRecipeResult]   = useState(null);
  const [recipeSource, setRecipeSource]   = useState('fusion');

  // Scan state
  const [scanImage, setScanImage]                   = useState(null); // base64 data URL
  const [scanMediaType, setScanMediaType]           = useState('image/jpeg');
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [scanParams, setScanParams]                 = useState(INITIAL_SCAN);

  // Fusion state
  const [fusionParams, setFusionParams] = useState(INITIAL_FUSION);

  // Persistent state
  const [favorites, setFavorites] = useState(() => loadLS('fr_favorites', []));
  const [allergies, setAllergies] = useState(() => loadLS('fr_allergies', []));

  useEffect(() => { localStorage.setItem('fr_favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('fr_allergies', JSON.stringify(allergies)); }, [allergies]);

  const navigate = (to) => {
    setPrevScreen(screen);
    setScreen(to);
  };

  const handleRecipeGenerated = (recipe, source) => {
    setRecipeResult(recipe);
    setRecipeSource(source);
    navigate('result');
  };

  const toggleFavorite = () => {
    if (!recipeResult) return;
    setFavorites((prev) => {
      const exists = prev.some((f) => f.name === recipeResult.name);
      if (exists) return prev.filter((f) => f.name !== recipeResult.name);
      return [...prev, { ...recipeResult, savedAt: new Date().toISOString() }];
    });
  };

  const isFav = recipeResult ? favorites.some((f) => f.name === recipeResult.name) : false;

  const showNav = screen !== 'home';

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center p-0">
      <div
        className="relative flex flex-col bg-cream overflow-hidden shadow-2xl"
        style={{ width: '100%', maxWidth: 390, height: '100dvh', maxHeight: 844 }}
      >
        {/* Screen content */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide ${showNav ? 'pb-16' : ''}`}>
          {screen === 'home' && (
            <HomeScreen
              onFusionClick={() => navigate('fusion')}
              onScanClick={() => navigate('scan')}
            />
          )}
          {screen === 'fusion' && (
            <FusionSelectScreen
              params={fusionParams}
              setParams={setFusionParams}
              allergies={allergies}
              onRecipeGenerated={(r) => handleRecipeGenerated(r, 'fusion')}
              onBack={() => navigate('home')}
            />
          )}
          {screen === 'scan' && (
            <ScanScreen
              params={scanParams}
              setParams={setScanParams}
              scanImage={scanImage}
              setScanImage={setScanImage}
              setScanMediaType={setScanMediaType}
              detectedIngredients={detectedIngredients}
              setDetectedIngredients={setDetectedIngredients}
              allergies={allergies}
              onDetected={() => navigate('scanResult')}
              onRecipeGenerated={(r) => handleRecipeGenerated(r, 'scan')}
              onBack={() => navigate('home')}
            />
          )}
          {screen === 'scanResult' && (
            <ScanResultScreen
              scanImage={scanImage}
              detectedIngredients={detectedIngredients}
              setDetectedIngredients={setDetectedIngredients}
              params={scanParams}
              setParams={setScanParams}
              allergies={allergies}
              onRecipeGenerated={(r) => handleRecipeGenerated(r, 'scan')}
              onBack={() => navigate('scan')}
            />
          )}
          {screen === 'result' && (
            <ResultScreen
              recipe={recipeResult}
              isFavorite={isFav}
              onToggleFavorite={toggleFavorite}
              onBack={() => navigate(recipeSource === 'fusion' ? 'fusion' : 'scanResult')}
              onHome={() => navigate('home')}
            />
          )}
          {screen === 'favorites' && (
            <FavoritesScreen
              favorites={favorites}
              onViewRecipe={(r) => { setRecipeResult(r); navigate('result'); }}
              onRemove={(name) => setFavorites((p) => p.filter((f) => f.name !== name))}
            />
          )}
          {screen === 'settings' && (
            <SettingsScreen allergies={allergies} setAllergies={setAllergies} />
          )}
        </div>

        {/* Bottom Nav */}
        {showNav && (
          <BottomNav
            current={screen}
            onNavigate={navigate}
          />
        )}
      </div>
    </div>
  );
}
