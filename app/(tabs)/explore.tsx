import { addTree } from '@/services/db'; // Импортируем нашу функцию
import React, { useState } from 'react';
import { Alert, Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddTreeScreen() {
  const [qrCode, setQrCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Здорово');

  const handleSave = () => {
    // 1. Простая валидация
    if (!qrCode || !name || !location) {
      Alert.alert('Ошибка', 'Заполните QR код, название и местоположение');
      return;
    }

    // 2. Сохраняем в SQLite
    const result = addTree(qrCode, name, location, status);

    if (result.success) {
      Alert.alert('Успех!', `Дерево "${name}" добавлено в базу.`);
      // Очищаем форму
      setQrCode('');
      setName('');
      setLocation('');
      setStatus('Здорово');
    } else {
      Alert.alert('Ошибка', 'Возможно, такой QR код уже есть в базе.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.header}>🌱 Новое дерево</Text>

          <Text style={styles.label}>QR Код (ID):</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: tree_005"
            value={qrCode}
            onChangeText={setQrCode}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Название породы:</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Сосна Обыкновенная"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Местоположение:</Text>
          <TextInput
            style={styles.input}
            placeholder="Например: Сектор В, Ряд 2"
            value={location}
            onChangeText={setLocation}
          />

          <Text style={styles.label}>Состояние:</Text>
          <TextInput
            style={styles.input}
            placeholder="Здорово / Болеет"
            value={status}
            onChangeText={setStatus}
          />

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
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#27ae60' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#34495e' },
  input: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: { marginTop: 10 }
});