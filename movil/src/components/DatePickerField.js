import React, { useState } from 'react';
import { Platform, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

function parseFecha(s) {
  if (!s) return null;
  const [a, m, d] = s.split('-').map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
}

export default function DatePickerField({ value, onChange, placeholder = 'AAAA-MM-DD' }) {
  const [mostrar, setMostrar] = useState(false);

  const valor = parseFecha(value);

  const alCambiar = (event, fecha) => {
    setMostrar(Platform.OS === 'ios');
    if (fecha) {
      const yy = fecha.getFullYear();
      const mm = String(fecha.getMonth() + 1).padStart(2, '0');
      const dd = String(fecha.getDate()).padStart(2, '0');
      onChange(`${yy}-${mm}-${dd}`);
    }
  };

  return (
    <View>
      <TouchableOpacity style={styles.movil} onPress={() => setMostrar(true)}>
        <Text style={styles.movilText}>{value || placeholder}</Text>
      </TouchableOpacity>
      {mostrar && (
        <DateTimePicker
          value={valor || new Date()}
          mode="date"
          display="default"
          onChange={alCambiar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  movil: {
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center'
  },
  movilText: { fontSize: 13, color: '#333' }
});