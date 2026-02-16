import { addTree } from '@/services/db';
import * as Location from 'expo-location'; // ИМПОРТ ЛОКАЦИИ
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddTreeScreen() {
  const [qrCode, setQrCode] = useState('');
  const [name, setName] = useState('');
  const [locationText, setLocationText] = useState('');
  const [status, setStatus] = useState('Здорово');

  // Новые стейты для GPS
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Функция получения GPS
  const getLocation = async () => {
    setIsLocating(true);
    try {
      // Спрашиваем разрешение
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Отказ', 'Без разрешения на геопозицию координаты не получить');
        setIsLocating(false);
        return;
      }

      // Получаем текущую точку (высокая точность)
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });

      setLat(location.coords.latitude);
      setLng(location.coords.longitude);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось поймать сигнал GPS');
      console.error('Ошибка GPS:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    if (!qrCode || !name) {
      Alert.alert('Ошибка', 'Заполните хотя бы QR код и название');
      return;
    }

    // Передаем координаты в базу
    const result = addTree(qrCode, name, locationText, status, lat, lng);

    if (result.success) {
      Alert.alert('Успех!', 'Дерево с координатами добавлено.');
      setQrCode(''); setName(''); setLocationText(''); setStatus('Здорово');
      setLat(null); setLng(null); // Сбрасываем GPS для следующего дерева
    } else {
      Alert.alert('Ошибка', 'Возможно, такой QR код уже есть.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>🌱 Новое дерево</Text>

          <Text style={styles.label}>QR Код (ID):</Text>
          <TextInput style={styles.input} value={qrCode} onChangeText={setQrCode} autoCapitalize="none" />

          <Text style={styles.label}>Название породы:</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Сектор / Участок (текст):</Text>
          <TextInput style={styles.input} value={locationText} onChangeText={setLocationText} />

          {/* БЛОК GPS */}
          <View style={styles.gpsBox}>
            <Text style={styles.label}>Точные координаты (GPS):</Text>
            {lat && lng ? (
              <Text style={styles.gpsText}>✅ {lat.toFixed(6)}, {lng.toFixed(6)}</Text>
            ) : (
              <Text style={styles.gpsText}>❌ Не определены</Text>
            )}

            {isLocating ? (
              <ActivityIndicator size="small" color="#3498db" style={{ marginTop: 10 }} />
            ) : (
              <View style={{ marginTop: 10 }}>
                <Button title="📍 Определить мое местоположение" onPress={getLocation} color="#3498db" />
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button title="💾 Сохранить в базу" onPress={handleSave} color="#2ecc71" />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#27ae60' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#34495e' },
  input: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, backgroundColor: '#f9f9f9' },
  gpsBox: { padding: 15, backgroundColor: '#ebf5fb', borderRadius: 8, marginBottom: 25, borderWidth: 1, borderColor: '#d6eaf8' },
  gpsText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginTop: 5 },
  buttonContainer: { marginTop: 10 }
});