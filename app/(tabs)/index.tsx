import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker'; // ИМПОРТ ДЛЯ ФОТО
import React, { useState } from 'react';
import { Alert, Button, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

import { addCareRecord, getTreeByQR, getTreeHistory } from '@/services/db';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [treeData, setTreeData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Нужен доступ к камере</Text>
        <Button onPress={requestPermission} title="Разрешить" />
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    Vibration.vibrate();

    const tree = getTreeByQR(data) as any;

    if (tree) {
      setTreeData(tree);
      const treeHistory = getTreeHistory(tree.id) as any[];
      setHistory(treeHistory);
    } else {
      setTreeData({ error: "Дерево не найдено в базе", id: data });
      setHistory([]);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setTreeData(null);
    setHistory([]);
  };

  // Обычные действия (полив, обрезка)
  const handleAction = (actionName: string) => {
    if (!treeData) return;

    // Внимание: передаем qr_code вторым параметром
    const result = addCareRecord(treeData.id, treeData.qr_code, actionName);

    if (result?.success) {
      setTreeData({ ...treeData, status: result.newStatus });
      setHistory([{ id: Date.now(), action: actionName, date_time: result.dateTime, photo_uri: null }, ...history]);
      Vibration.vibrate();
    }
  };

  // ФОТОФИКСАЦИЯ ПРОБЛЕМЫ
  const handlePhotoProblem = async () => {
    if (!treeData) return;

    // Спрашиваем разрешение на камеру (уже для фото, а не для сканера)
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Отказ", "Разрешите камере делать снимки!");
      return;
    }

    // Открываем камеру телефона
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5, // Сжимаем фото наполовину, чтобы не забивать память
    });

    if (!result.canceled) {
      const photoUri = result.assets[0].uri;

      // Записываем в базу
      const record = addCareRecord(treeData.id, treeData.qr_code, '⚠️ Проблема', photoUri);

      if (record?.success) {
        setTreeData({ ...treeData, status: record.newStatus });
        // Добавляем запись с фото в историю на экране
        setHistory([{
          id: Date.now(),
          action: '⚠️ Проблема',
          date_time: record.dateTime,
          photo_uri: photoUri
        }, ...history]);

        Vibration.vibrate();
        Alert.alert("Успех", "Фото проблемы сохранено");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!scanned ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.instruction}>Наведите камеру на QR-код саженца</Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {treeData?.error ? (
            <View style={styles.cardError}>
              <Text style={styles.errorText}>⚠️ Неизвестный QR-код</Text>
              <Text style={styles.subText}>ID: {treeData.id}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
                <Text style={styles.primaryButtonText}>Сканировать снова</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>

              {/* КАРТОЧКА ДЕРЕВА */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{treeData.name}</Text>
                  <View style={[styles.statusBadge, treeData.status?.includes('Проблема') ? styles.statusBadgeError : styles.statusBadgeSuccess]}>
                    <Text style={[styles.statusBadgeText, treeData.status?.includes('Проблема') ? styles.statusBadgeTextError : styles.statusBadgeTextSuccess]}>
                      {treeData.status?.includes('Проблема') ? 'Требует внимания' : 'В норме'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>📅 Дата посадки</Text>
                    <Text style={styles.value}>{treeData.planted_date}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>📍 Локация</Text>
                    <Text style={styles.value}>{treeData.location}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>ℹ️ Текущий статус</Text>
                    <Text style={styles.valueHighlight}>{treeData.status}</Text>
                  </View>
                </View>

                {/* ПАНЕЛЬ БЫСТРЫХ ДЕЙСТВИЙ */}
                <Text style={styles.actionsTitle}>Быстрые действия</Text>
                <View style={styles.buttonsRow}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e3f2fd' }]} onPress={() => handleAction('Полив')}>
                    <Text style={styles.actionBtnEmoji}>💧</Text>
                    <Text style={[styles.actionBtnText, { color: '#2980b9' }]}>Полив</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef5e7' }]} onPress={() => handleAction('Обрезка')}>
                    <Text style={styles.actionBtnEmoji}>✂️</Text>
                    <Text style={[styles.actionBtnText, { color: '#d35400' }]}>Обрезка</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f9ebea' }]} onPress={() => handleAction('Лечение')}>
                    <Text style={styles.actionBtnEmoji}>💊</Text>
                    <Text style={[styles.actionBtnText, { color: '#c0392b' }]}>Лечение</Text>
                  </TouchableOpacity>
                </View>

                {/* КНОПКА ФОТОФИКСАЦИИ */}
                <TouchableOpacity style={styles.dangerButton} onPress={handlePhotoProblem}>
                  <Text style={styles.dangerButtonText}>📸 Зафиксировать проблему</Text>
                </TouchableOpacity>
              </View>

              {/* ИСТОРИЯ УХОДА */}
              <Text style={styles.historyMainTitle}>Журнал ухода</Text>
              <View style={styles.historyContainer}>
                {history.length === 0 ? (
                  <Text style={styles.emptyHistory}>Записей пока нет</Text>
                ) : (
                  history.map((item, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyTimeline}>
                        <View style={styles.timelineDot} />
                        {index !== history.length - 1 && <View style={styles.timelineLine} />}
                      </View>

                      <View style={styles.historyContent}>
                        <View style={styles.historyTextRow}>
                          <Text style={styles.historyAction}>
                            {item.action === 'Полив' ? '💧' : item.action === 'Обрезка' ? '✂️' : item.action === 'Лечение' ? '💊' : '⚠️'} {item.action}
                          </Text>
                          <Text style={styles.historyDate}>{item.date_time}</Text>
                        </View>

                        {item.photo_uri ? (
                          <Image source={{ uri: item.photo_uri }} style={styles.historyImage} />
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
                <Text style={styles.primaryButtonText}>📷 Следующее дерево</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  permissionText: { marginBottom: 20, fontSize: 18, color: '#2c3e50' },
  cameraContainer: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 260, height: 260, borderWidth: 3, borderColor: '#2ecc71', borderRadius: 20, backgroundColor: 'transparent', marginBottom: 20, shadowColor: '#2ecc71', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 },
  instruction: { color: '#fff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: 'hidden' },

  resultContainer: { flex: 1, padding: 15, backgroundColor: '#f4f6f8' },

  // Карточки
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardError: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginTop: '50%' },

  // Шапка карточки
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#2c3e50', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeSuccess: { backgroundColor: '#e8f8f5' },
  statusBadgeError: { backgroundColor: '#fdedec' },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  statusBadgeTextSuccess: { color: '#27ae60' },
  statusBadgeTextError: { color: '#e74c3c' },

  // Сетка информации
  infoGrid: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 15, marginBottom: 20 },
  infoItem: { marginBottom: 12 },
  label: { fontSize: 13, color: '#7f8c8d', marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  value: { fontSize: 16, color: '#2c3e50', fontWeight: '500' },
  valueHighlight: { fontSize: 16, color: '#27ae60', fontWeight: '700' },

  // Панель действий
  actionsTitle: { fontSize: 16, fontWeight: '700', color: '#34495e', marginBottom: 12 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, alignItems: 'center', marginHorizontal: 4 },
  actionBtnEmoji: { fontSize: 24, marginBottom: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },

  // Главные кнопки
  dangerButton: { backgroundColor: '#feeceb', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fadbd8' },
  dangerButtonText: { color: '#e74c3c', fontSize: 16, fontWeight: '700' },
  primaryButton: { backgroundColor: '#27ae60', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#27ae60', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // История в стиле Timeline
  historyMainTitle: { fontSize: 20, fontWeight: '800', color: '#2c3e50', marginBottom: 15, marginLeft: 5 },
  historyContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  historyItem: { flexDirection: 'row', minHeight: 60 },
  historyTimeline: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ecc71', marginTop: 5, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#eaeded', position: 'absolute', top: 17, bottom: -5, zIndex: 1 },
  historyContent: { flex: 1, paddingBottom: 20, paddingLeft: 10 },
  historyTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyAction: { fontSize: 16, fontWeight: '700', color: '#34495e' },
  historyDate: { fontSize: 13, color: '#95a5a6', fontWeight: '500' },
  historyImage: { width: '100%', height: 180, borderRadius: 16, marginTop: 8, backgroundColor: '#f4f6f8' },
  emptyHistory: { fontSize: 15, color: '#bdc3c7', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  errorText: { fontSize: 22, color: '#c0392b', fontWeight: '800', marginBottom: 10 },
  subText: { fontSize: 16, color: '#7f8c8d', marginBottom: 30 }
});