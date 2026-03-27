import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DARK_COLORS } from './constants';

const AppContext = createContext(null);

const MAX_HISTORY = 20;

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
  const [favorites, setFavorites]                   = useState([]);
  const [history, setHistory]                       = useState([]);
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

  // Track whether initial load is complete to avoid overwriting persisted data
  const loaded = useRef(false);

  // Load persisted data once on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('fr_favorites'),
      AsyncStorage.getItem('fr_history'),
      AsyncStorage.getItem('fr_allergies'),
      AsyncStorage.getItem('fr_fav_countries'),
      AsyncStorage.getItem('fr_onboarding'),
      AsyncStorage.getItem('fr_darkmode'),
      AsyncStorage.getItem('fr_shopping'),
      AsyncStorage.getItem('fr_dislikes'),
      AsyncStorage.getItem('fr_avoid_methods'),
    ]).then(([favs, hist, alls, countries, onboarding, dark, shopping, dis, avoid]) => {
      if (favs)       setFavorites(JSON.parse(favs));
      if (hist)       setHistory(JSON.parse(hist));
      if (alls)       setAllergies(JSON.parse(alls));
      if (countries)  setFavoriteCountries(JSON.parse(countries));
      if (onboarding) setHasSeenOnboardingState(true);
      if (dark)       setDarkModeState(true);
      if (shopping)   setShoppingList(JSON.parse(shopping));
      if (dis)        setDislikesState(JSON.parse(dis));
      if (avoid)      setAvoidMethodsState(JSON.parse(avoid));
      loaded.current = true;
    });
  }, []);

  // Persist only after initial load
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem('fr_favorites', JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem('fr_history', JSON.stringify(history));
  }, [history]);
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

  const toggleFavorite = (recipe, imageBase64 = null) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.name === recipe.name);
      if (exists) return prev.filter((f) => f.name !== recipe.name);
      return [...prev, { ...recipe, savedImage: imageBase64, savedAt: new Date().toISOString() }];
    });
  };

  const isFavorite = (name) => favorites.some((f) => f.name === name);

  const addToHistory = (recipe) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.name !== recipe.name);
      const updated  = [{ ...recipe, viewedAt: new Date().toISOString() }, ...filtered];
      return updated.slice(0, MAX_HISTORY);
    });
  };

  const updateHistoryImage = (recipeName, imageBase64) => {
    if (!recipeName || !imageBase64) return;
    setHistory((prev) =>
      prev.map((h) =>
        h.name === recipeName && !h.savedImage
          ? { ...h, savedImage: imageBase64 }
          : h
      )
    );
  };

  return (
    <AppContext.Provider value={{
      favorites, setFavorites,
      history, setHistory, addToHistory, updateHistoryImage,
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
      toggleFavorite, isFavorite,
      favoriteCountries, toggleFavoriteCountry,
      hasSeenOnboarding, setHasSeenOnboarding,
      darkMode, setDarkMode,
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
