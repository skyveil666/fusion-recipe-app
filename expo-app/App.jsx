import 'react-native-gesture-handler';
import React, { useEffect, Component } from 'react';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Purchases from 'react-native-purchases';

import { AppProvider } from './src/AppContext';
import { REVENUECAT_API_KEY } from './src/constants';
import HomeScreen         from './src/screens/HomeScreen';
import FusionSelectScreen from './src/screens/FusionSelectScreen';
import SingleRecipeScreen from './src/screens/SingleRecipeScreen';
import SeasonalScreen     from './src/screens/SeasonalScreen';
import PFCScreen          from './src/screens/PFCScreen';
import ResultScreen       from './src/screens/ResultScreen';
import FavoritesScreen    from './src/screens/FavoritesScreen';
import HistoryScreen      from './src/screens/HistoryScreen';
import SettingsScreen     from './src/screens/SettingsScreen';
import OnboardingScreen   from './src/screens/OnboardingScreen';
import PhotoRecipeScreen  from './src/screens/PhotoRecipeScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import DishFusionScreen   from './src/screens/DishFusionScreen';
import LeftoverScreen     from './src/screens/LeftoverScreen';
import PaywallScreen      from './src/screens/PaywallScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createStackNavigator();

class ErrorBoundary extends Component {
  state = { error: null };
  componentDidCatch(e) { this.setState({ error: e.message }); }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#ff4444', fontSize: 13, textAlign: 'center' }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync();
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppProvider>
            <NavigationContainer>
              <StatusBar style="light" backgroundColor="#2d5a1b" />
              <Stack.Navigator
                initialRouteName="Home"
                screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
              >
                <Stack.Screen name="Home"         component={HomeScreen} />
                <Stack.Screen name="Onboarding"   component={OnboardingScreen} options={{ animation: 'fade' }} />
                <Stack.Screen name="FusionSelect" component={FusionSelectScreen} />
                <Stack.Screen name="SingleRecipe" component={SingleRecipeScreen} />
                <Stack.Screen name="Seasonal"     component={SeasonalScreen} />
                <Stack.Screen name="PFCRecipe"    component={PFCScreen} />
                <Stack.Screen name="Result"       component={ResultScreen} />
                <Stack.Screen name="Favorites"    component={FavoritesScreen} />
                <Stack.Screen name="History"      component={HistoryScreen} />
                <Stack.Screen name="Settings"     component={SettingsScreen} />
                <Stack.Screen name="PhotoRecipe"   component={PhotoRecipeScreen} />
                <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
                <Stack.Screen name="DishFusion"   component={DishFusionScreen} />
                <Stack.Screen name="Paywall"      component={PaywallScreen} />
                <Stack.Screen name="Leftover"     component={LeftoverScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </AppProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
