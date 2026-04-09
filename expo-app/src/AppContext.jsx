import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { COLORS, DARK_COLORS, API_BASE } from './constants';

const AppContext = createContext(null);

const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
};

const INITIAL_FUSION = {
  country1: '',
  country2: '',
  isPfcEnabled: false,
  pfc: { p: 30, f: 25, c: 45 },
  ingredients: [],
  servings: '2人前',
  category: '主菜',
};

const INITIAL_SCAN = { category: '主菜', servings: '2人前' };

export function AppProvider({ children }) {
  const [savedRecipes, setSavedRecipesState]        = useState([]);
  const [allergies, setAllergies]                   = useState([]);
  const [dislikes, setDislikesState]                = useState([]);
  const [avoidMethods, setAvoidMethodsState]        = useState([]);
  const [favoriteCountries, setFavoriteCountries]   = useState([]);
  const [shoppingList, setShoppingList]             = useState([]);
  const [recipeResult, setRecipeResult]             = useState(null);
  const [recipeSource, setRecipeSource]             = useState('fusion');
  const [scanImage, setScanImage]                   = useState(null);
  const [detectedIngredients, setDetectedIngredients] = useState([]);
  const [fusionParams, setFusionParams]             = useState(INITIAL_FUSION);
  const [scanParams, setScanParams]                 = useState(INITIAL_SCAN);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
  const [darkMode, setDarkModeState] = useState(false);

  // ── 利用回数管理 ──────────────────────────────────────
  const [monthlyUsed,  setMonthlyUsedState]  = useState(0);
  const [bonusRecipes, setBonusRecipesState] = useState(0);
  const [isPremium,    setIsPremiumState]    = useState(false);

  // 計算値
  const monthlyLimit  = isPremium ? 20 : 5;
  const remaining     = Math.max(0, monthlyLimit - monthlyUsed);
  const canGenerate   = remaining > 0 || bonusRecipes > 0;

  // 永続化ヘルパー
  const setMonthlyUsed = (val) => {
    const v = typeof val === 'function' ? val(monthlyUsed) : val;
    setMonthlyUsedState(v);
    AsyncStorage.setItem('fr_monthly_used', String(v));
  };
  const setBonusRecipes = (val) => {
    const v = typeof val === 'function' ? val(bonusRecipes) : val;
    setBonusRecipesState(v);
    AsyncStorage.setItem('fr_bonus_recipes', String(v));
  };
  const setIsPremium = async (val) => {
    setIsPremiumState(val);
    AsyncStorage.setItem('fr_is_premium', val ? '1' : '');
    try {
      const deviceId = await getDeviceId();
      await fetch(`${API_BASE}/api/usage/${deviceId}/premium`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPremium: val }),
      });
    } catch { /* ignore */ }
  };

  // 1回消費（生成成功時に呼ぶ）— ローカル楽観更新→サーバー確定
  const useRecipe = async () => {
    if (remaining > 0) {
      setMonthlyUsed(prev => prev + 1);
    } else if (bonusRecipes > 0) {
      setBonusRecipes(prev => prev - 1);
    }
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${API_BASE}/api/usage/${deviceId}/consume`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setMonthlyUsedState(data.monthlyUsed);
        setBonusRecipesState(data.bonusRecipes);
      }
    } catch { /* サーバー同期失敗時はローカル値を維持 */ }
  };

  // 追加購入で回数を追加
  const addBonusRecipes = async (n) => {
    setBonusRecipes(prev => prev + n);
    try {
      const deviceId = await getDeviceId();
      await fetch(`${API_BASE}/api/usage/${deviceId}/bonus`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: n }),
      });
    } catch { /* ignore */ }
  };

  const setHasSeenOnboarding = (val) => {
    setHasSeenOnboardingState(val);
    AsyncStorage.setItem('fr_onboarding', val ? '1' : '');
  };

  const setDarkMode = (val) => {
    setDarkModeState(val);
    AsyncStorage.setItem('fr_darkmode', val ? '1' : '');
  };

  const setDislikes = (val) => {
    const v = typeof val === 'function' ? val(dislikes) : val;
    setDislikesState(v);
    AsyncStorage.setItem('fr_dislikes', JSON.stringify(v));
  };
  const setAvoidMethods = (val) => {
    const v = typeof val === 'function' ? val(avoidMethods) : val;
    setAvoidMethodsState(v);
    AsyncStorage.setItem('fr_avoid_methods', JSON.stringify(v));
  };

  // ── デバイスID（サーバー同期用） ──────────────────────────
  const deviceIdRef = useRef(null);

  const getDeviceId = async () => {
    if (deviceIdRef.current) return deviceIdRef.current;
    // Android IDを優先（再インストール後も同じIDが返る）
    let id = null;
    try {
      id = Application.getAndroidId();
    } catch {}
    if (!id) {
      // フォールバック：AsyncStorageのランダムID（エミュレータ等）
      id = await AsyncStorage.getItem('fr_device_id');
      if (!id) {
        id = 'dev_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
        await AsyncStorage.setItem('fr_device_id', id);
      }
    }
    deviceIdRef.current = id;
    return id;
  };

  const syncWithServer = async (deviceId) => {
    try {
      const res = await fetch(`${API_BASE}/api/usage/${deviceId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMonthlyUsedState(data.monthlyUsed ?? 0);
      setBonusRecipesState(data.bonusRecipes ?? 0);
      setIsPremiumState(data.isPremium ?? false);
      AsyncStorage.setItem('fr_monthly_used', String(data.monthlyUsed ?? 0));
      AsyncStorage.setItem('fr_bonus_recipes', String(data.bonusRecipes ?? 0));
      AsyncStorage.setItem('fr_is_premium', data.isPremium ? '1' : '');
    } catch { /* ネットワークエラー時はローカルデータを使用 */ }
  };

  // Track whether initial load is complete to avoid overwriting persisted data
  const loaded = useRef(false);

  // Load persisted data once on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('fr_saved_recipes'),
      AsyncStorage.getItem('fr_favorites'),
      AsyncStorage.getItem('fr_history'),
      AsyncStorage.getItem('fr_allergies'),
      AsyncStorage.getItem('fr_fav_countries'),
      AsyncStorage.getItem('fr_onboarding'),
      AsyncStorage.getItem('fr_darkmode'),
      AsyncStorage.getItem('fr_shopping'),
      AsyncStorage.getItem('fr_dislikes'),
      AsyncStorage.getItem('fr_avoid_methods'),
      AsyncStorage.getItem('fr_monthly_used'),
      AsyncStorage.getItem('fr_bonus_recipes'),
      AsyncStorage.getItem('fr_is_premium'),
      AsyncStorage.getItem('fr_last_reset'),
    ]).then(([savedRaw, favs, hist, alls, countries, onboarding, dark, shopping, dis, avoid, mUsed, bonus, premium, lastReset]) => {
      // savedRecipes マイグレーション
      if (savedRaw) {
        setSavedRecipesState(JSON.parse(savedRaw));
      } else {
        // fr_history + fr_favorites から移行
        const histArr = hist ? JSON.parse(hist) : [];
        const favArr  = favs ? JSON.parse(favs) : [];
        const favNames = new Set(favArr.map(f => f.name));
        const histNames = new Set(histArr.map(h => h.name));
        const migrated = histArr.map(h => ({
          id: Math.random().toString(36).slice(2, 10),
          createdAt: h.viewedAt || new Date().toISOString(),
          source: 'unknown',
          favorite: favNames.has(h.name),
          memo: '',
          savedImage: h.savedImage || null,
          ...h,
        }));
        // favorites の中で history にないものも追加
        favArr.filter(f => !histNames.has(f.name)).forEach(f => {
          migrated.push({
            id: Math.random().toString(36).slice(2, 10),
            createdAt: f.savedAt || new Date().toISOString(),
            source: 'unknown',
            favorite: true,
            memo: '',
            savedImage: f.savedImage || null,
            ...f,
          });
        });
        setSavedRecipesState(migrated);
      }

      if (alls)       setAllergies(JSON.parse(alls));
      if (countries)  setFavoriteCountries(JSON.parse(countries));
      if (onboarding) setHasSeenOnboardingState(true);
      if (dark)       setDarkModeState(true);
      if (shopping)   setShoppingList(JSON.parse(shopping));
      if (dis)        setDislikesState(JSON.parse(dis));
      if (avoid)      setAvoidMethodsState(JSON.parse(avoid));
      if (bonus)      setBonusRecipesState(parseInt(bonus, 10));
      if (premium)    setIsPremiumState(true);

      // 月次リセット
      const currentMonth = getCurrentMonth();
      if (!lastReset || lastReset !== currentMonth) {
        setMonthlyUsedState(0);
        AsyncStorage.setItem('fr_monthly_used', '0');
        AsyncStorage.setItem('fr_last_reset', currentMonth);
      } else if (mUsed) {
        setMonthlyUsedState(parseInt(mUsed, 10));
      }

      loaded.current = true;
      // サーバーと同期（ローカルデータ読み込み後）
      getDeviceId().then(id => syncWithServer(id));
    });
  }, []);

  // Persist savedRecipes after initial load
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem('fr_saved_recipes', JSON.stringify(savedRecipes));
  }, [savedRecipes]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem('fr_allergies', JSON.stringify(allergies));
  }, [allergies]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem('fr_fav_countries', JSON.stringify(favoriteCountries));
  }, [favoriteCountries]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem('fr_shopping', JSON.stringify(shoppingList));
  }, [shoppingList]);

  // Shopping list operations
  const addToShoppingList = (items, recipeName) => {
    setShoppingList((prev) => {
      const newItems = items.map((ing) => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: ing.name,
        amount: ing.amount || '',
        recipeName: recipeName || '',
        bought: false,
        addedAt: new Date().toISOString(),
      }));
      return [...prev, ...newItems];
    });
  };

  const toggleShoppingItem = (id) => {
    setShoppingList((prev) =>
      prev.map((item) => item.id === id ? { ...item, bought: !item.bought } : item)
    );
  };

  const removeShoppingItem = (id) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));
  };

  const clearBoughtItems = () => {
    setShoppingList((prev) => prev.filter((item) => !item.bought));
  };

  const clearAllShoppingItems = () => setShoppingList([]);

  const isInShoppingList = (name) =>
    shoppingList.some((item) => !item.bought && item.name === name);

  const removeFromShoppingListByName = (name) => {
    setShoppingList((prev) => prev.filter((item) => item.name !== name));
  };

  const toggleFavoriteCountry = (country) => {
    if (!country) return;
    setFavoriteCountries((prev) => {
      if (prev.includes(country)) return prev.filter((c) => c !== country);
      if (prev.length >= 10) return prev;
      return [...prev, country];
    });
  };

  const addToHistory = (recipe, source = 'unknown') => {
    setSavedRecipesState(prev => {
      const filtered = prev.filter(r => r.name !== recipe.name);
      const newRecord = {
        id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
        createdAt: new Date().toISOString(),
        source,
        favorite: false,
        memo: '',
        savedImage: null,
        ...recipe,
      };
      return [newRecord, ...filtered].slice(0, 50);
    });
  };

  const updateHistoryImage = (recipeName, imageBase64) => {
    if (!recipeName || !imageBase64) return;
    setSavedRecipesState(prev =>
      prev.map(r => r.name === recipeName && !r.savedImage ? { ...r, savedImage: imageBase64 } : r)
    );
  };

  const toggleFavorite = (name) => {
    setSavedRecipesState(prev =>
      prev.map(r => r.name === name ? { ...r, favorite: !r.favorite } : r)
    );
  };

  const isFavorite = (name) => savedRecipes.some(r => r.name === name && r.favorite);

  const updateMemo = (name, memo) => {
    setSavedRecipesState(prev =>
      prev.map(r => r.name === name ? { ...r, memo } : r)
    );
  };

  const clearHistory = () => setSavedRecipesState([]);

  const removeRecipe = (name) => {
    setSavedRecipesState(prev => prev.filter(r => r.name !== name));
  };

  // 後方互換
  const history = savedRecipes;
  const favorites = savedRecipes.filter(r => r.favorite);
  const setHistory = (val) => {
    const v = typeof val === 'function' ? val(savedRecipes) : val;
    setSavedRecipesState(v);
  };
  const setFavorites = () => {}; // no-op

  return (
    <AppContext.Provider value={{
      savedRecipes,
      addToHistory, updateHistoryImage,
      toggleFavorite, isFavorite,
      updateMemo, clearHistory, removeRecipe,
      // 後方互換
      favorites, setFavorites,
      history, setHistory,
      allergies, setAllergies,
      dislikes, setDislikes,
      avoidMethods, setAvoidMethods,
      shoppingList, addToShoppingList, toggleShoppingItem,
      removeShoppingItem, clearBoughtItems, clearAllShoppingItems, isInShoppingList, removeFromShoppingListByName,
      recipeResult, setRecipeResult,
      recipeSource, setRecipeSource,
      scanImage, setScanImage,
      detectedIngredients, setDetectedIngredients,
      fusionParams, setFusionParams,
      scanParams, setScanParams,
      favoriteCountries, toggleFavoriteCountry,
      hasSeenOnboarding, setHasSeenOnboarding,
      darkMode, setDarkMode,
      monthlyUsed, monthlyLimit, remaining, bonusRecipes, isPremium,
      canGenerate, useRecipe, addBonusRecipes, setIsPremium,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export const useTheme = () => {
  const { darkMode } = useContext(AppContext);
  return darkMode ? DARK_COLORS : COLORS;
};
