import { addSector } from '@/services/db';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddSectorScreen() {
  const [qrCode, setQrCode] = useState('');
  const [name, setName] = useState('');
  const [treeType, setTreeType] = useState('');
  const [totalCount, setTotalCount] = useState('');

  // 🆕 Новые поля
  const [age, setAge] = useState('');
  const [growingSchool, setGrowingSchool] = useState('');
  const [height, setHeight] = useState('');
  const [rootBallSize, setRootBallSize] = useState('');
  const [plantType, setPlantType] = useState('Дерево'); // По умолчанию

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const plantTypes = ['Дерево', 'Кустарник', 'Живая изгородь'];

  const handleGetLocation = async () => {
    setIsLocating(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Нет доступа к геопозиции');
      setIsLocating(false); return;
    }
    try {
      let location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude);
      setLng(location.coords.longitude);
      Alert.alert('Успех', 'GPS координаты получены!');
    } catch (error) { Alert.alert('Ошибка', 'Не удалось получить координаты'); }
    finally { setIsLocating(false); }
  };

  const handleSave = () => {
    if (!qrCode || !name || !treeType || !totalCount) {
      Alert.alert('Внимание', 'Заполните обязательные поля (QR, Название, Порода, Кол-во)');
      return;
    }
    const countNum = parseInt(totalCount, 10);

    // 🆕 Передаем новые поля в базу
    const result = addSector(
      qrCode, name, treeType, countNum, 'В норме', lat, lng,
      age, growingSchool, height, rootBallSize, plantType
    );

    if (result.success) {
      Alert.alert('Готово', 'Сектор успешно добавлен!');
      setQrCode(''); setName(''); setTreeType(''); setTotalCount('');
      setAge(''); setGrowingSchool(''); setHeight(''); setRootBallSize(''); setLat(null); setLng(null);
    } else {
      Alert.alert('Ошибка', 'Не удалось сохранить (возможно такой QR уже есть)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Новая партия</Text>
          <Text style={styles.headerSub}>Паспорт насаждений сектора</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>QR-код (ID таблички) *</Text>
            <TextInput style={styles.input} placeholder="Например: sector_A1" value={qrCode} onChangeText={setQrCode} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Участок / Сектор *</Text>
            <TextInput style={styles.input} placeholder="Например: Теплица №4" value={name} onChangeText={setName} />
          </View>

          {/* 🆕 Выбор вида (Кнопки) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Категория насаждения *</Text>
            <View style={styles.typeSelector}>
              {plantTypes.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, plantType === type && styles.typeBtnActive]}
                  onPress={() => setPlantType(type)}
                >
                  <Text style={[styles.typeBtnText, plantType === type && styles.typeBtnTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Порода *</Text>
            <TextInput style={styles.input} placeholder="Например: Ель голубая" value={treeType} onChangeText={setTreeType} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Количество (шт.) *</Text>
            <TextInput style={styles.input} placeholder="500" value={totalCount} onChangeText={setTotalCount} keyboardType="numeric" />
          </View>

          {/* 🆕 Новые агрономические поля */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Возраст</Text>
              <TextInput style={styles.input} placeholder="Напр: 3 года" value={age} onChangeText={setAge} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Высота (м)</Text>
              <TextInput style={styles.input} placeholder="Напр: 1.5-2" value={height} onChangeText={setHeight} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Школа выращивания</Text>
              <TextInput style={styles.input} placeholder="Напр: 2 школа" value={growingSchool} onChangeText={setGrowingSchool} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Размер кома</Text>
              <TextInput style={styles.input} placeholder="Напр: 60x60" value={rootBallSize} onChangeText={setRootBallSize} />
            </View>
          </View>

          <View style={styles.gpsContainer}>
            <View style={styles.gpsInfo}>
              <Text style={styles.label}>Координаты (GPS)</Text>
              <Text style={lat ? styles.gpsTextSuccess : styles.gpsTextWait}>
                {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Не заданы'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.gpsButton, lat ? styles.gpsButtonSuccess : {}]} onPress={handleGetLocation} disabled={isLocating}>
              {isLocating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.gpsButtonText}>{lat ? '📍 Обновить' : '📍 Получить'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>✅ Сохранить партию</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  scrollContent: { padding: 20 },
  header: { marginBottom: 20, marginTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#2c3e50' },
  headerSub: { fontSize: 15, color: '#7f8c8d', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: '#34495e', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eaeded', borderRadius: 12, padding: 14, fontSize: 16 },

  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#f4f6f8', borderWidth: 1, borderColor: '#eaeded' },
  typeBtnActive: { backgroundColor: '#e3f2fd', borderColor: '#3498db' },
  typeBtnText: { color: '#7f8c8d', fontWeight: '600', fontSize: 13 },
  typeBtnTextActive: { color: '#2980b9', fontWeight: '800' },

  gpsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#eaeded', marginTop: 10 },
  gpsInfo: { flex: 1 },
  gpsTextWait: { color: '#95a5a6', fontSize: 14, marginTop: 4 },
  gpsTextSuccess: { color: '#27ae60', fontSize: 14, fontWeight: '600', marginTop: 4 },
  gpsButton: { backgroundColor: '#3498db', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  gpsButtonSuccess: { backgroundColor: '#2ecc71' },
  gpsButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  saveButton: { backgroundColor: '#27ae60', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});