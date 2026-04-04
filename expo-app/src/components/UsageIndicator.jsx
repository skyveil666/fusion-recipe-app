import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../AppContext';

export default function UsageIndicator({ navigation }) {
  const { remaining, bonusRecipes, canGenerate } = useApp();

  const isEmpty  = remaining === 0 && bonusRecipes === 0;
  const isLow    = remaining <= 1 && !isEmpty;

  const bg     = isEmpty ? '#fef2f2' : isLow ? '#fff7ed' : '#f0fdf4';
  const border = isEmpty ? '#fca5a5' : isLow ? '#fdba74' : '#86efac';
  const numClr = isEmpty ? '#dc2626' : isLow ? '#92400e' : '#3a5a18';
  const plusClr= isEmpty ? '#dc2626' : isLow ? '#92400e' : '#3a5a18';

  return (
    <TouchableOpacity
      style={[s.pill, { backgroundColor: bg, borderColor: border }]}
      onPress={() => navigation.navigate('Paywall')}
      activeOpacity={0.8}
    >
      <Text style={s.label}>
        残り{' '}
        <Text style={[s.num, { color: numClr }]}>{remaining}回</Text>
        {bonusRecipes > 0 && (
          <Text style={s.bonus}>
            {' '}｜ 追加{' '}
            <Text style={[s.num, { color: '#7c3aed' }]}>{bonusRecipes}回</Text>
          </Text>
        )}
      </Text>
      <Text style={[s.plus, { color: plusClr }]}>＋</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-end',
  },
  label:  { fontSize: 13, color: '#1a1a1a' },
  num:    { fontWeight: '800' },
  bonus:  { color: '#555' },
  plus:   { fontSize: 16, fontWeight: '900' },
});
