import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { CATEGORIAS_EMOJI } from './emojis';

// Panel de emojis estilo WhatsApp para insertar en los textos de incidencias.
// onInsert(emoji) agrega el emoji en el cursor del campo correspondiente.
export default function SelectorEmoji({ onInsert, color = '#2980b9' }) {
  const [abierto, setAbierto] = useState(false);
  const [cat, setCat] = useState(0);
  const categoria = CATEGORIAS_EMOJI[cat];

  return (
    <View style={styles.contenedor}>
      <TouchableOpacity style={[styles.boton, { borderColor: color }]} onPress={() => setAbierto(!abierto)}>
        <Text style={styles.botonTexto}>{abierto ? '✕' : '😊'}</Text>
      </TouchableOpacity>

      {abierto && (
        <View style={[styles.panel, { shadowColor: '#000' }]}>
          <View style={styles.tabs}>
            {CATEGORIAS_EMOJI.map((c, i) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.tab, cat === i && { backgroundColor: `${color}33` }]}
                onPress={() => setCat(i)}
              >
                <Text style={styles.tabIcono}>{c.icono}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.lista} nestedScrollEnabled>
            <View style={styles.grid}>
              {categoria.emojis.map((e, i) => (
                <TouchableOpacity key={`${categoria.id}-${i}`} style={styles.emoji} onPress={() => onInsert(e)}>
                  <Text style={styles.emojiTexto}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.nombreCat}>{categoria.nombre}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'relative', zIndex: 50 },
  boton: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'
  },
  botonTexto: { fontSize: 16 },
  panel: {
    position: 'absolute',
    right: 0,
    top: 38,
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    padding: 8,
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 60
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 6, marginBottom: 6 },
  tab: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 4 },
  tabIcono: { fontSize: 15 },
  lista: { maxHeight: 190 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  emoji: { width: '12.5%', alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  emojiTexto: { fontSize: 21 },
  nombreCat: { fontSize: 10, color: '#888', textAlign: 'right', marginTop: 4 }
});
