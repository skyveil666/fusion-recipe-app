import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigationState } from '@react-navigation/native';
import { useTheme } from '../AppContext';

const TABS = [
  { name: 'ShoppingList', label: '買い物', icon: '🛒' },
  { name: 'Favorites',    label: 'お気に入り', icon: '❤️' },
  { name: 'History',      label: '履歴',      icon: '🕐' },
  { name: 'Home',         label: 'ホーム',    icon: '🏠' },
  { name: 'Settings',     label: '設定',      icon: '⚙️' },
];

const ACTIVE_SCREENS = {
  ShoppingList: 'ShoppingList',
  Favorites:    'Favorites',
  History:      'History',
  Home:         'Home',
  Settings:     'Settings',
};

export default function BottomNav({ navigation }) {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const currentRoute = useNavigationState((st) => st.routes[st.index].name);
  const activeTab = ACTIVE_SCREENS[currentRoute] ?? 'Home';

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map(({ name, label, icon }) => {
        const active = activeTab === name;
        return (
          <TouchableOpacity
            key={name}
            style={s.tab}
            onPress={() => navigation.navigate(name)}
            activeOpacity={0.7}
          >
            <Text style={s.icon}>{icon}</Text>
            <Text style={[s.label, active && s.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (C) => StyleSheet.create({
  container: {
    flexDirection:   'row',
    backgroundColor: C.white,
    borderTopWidth:  1,
    borderTopColor:  C.creamBorder,
    paddingTop:      8,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  icon:        { fontSize: 20 },
  label:       { fontSize: 10, color: C.textMuted },
  labelActive: { color: C.primary, fontWeight: '700' },
});
