import React from 'react';
import { View } from 'react-native';
import TemaButton from './TemaButton';
import LogoutButton from './LogoutButton';

export default function HeaderButtons() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TemaButton />
      <LogoutButton />
    </View>
  );
}