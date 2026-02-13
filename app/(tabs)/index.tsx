import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Button, SafeAreaView, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
// Импортируем наши функции БД
import { addCareRecord, getTreeByQR, getTreeHistory, initDB, seedDatabase } from '@/services/db';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [treeData, setTreeData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]); // НОВЫЙ СТЕЙТ
  // ПРИ ЗАПУСКЕ: Инициализируем БД
  useEffect(() => {
    initDB();      // Создать таблицу
    seedDatabase(); // Закинуть тестовые деревья
  }, []);

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
      // Подтягиваем историю этого дерева
      const treeHistory = getTreeHistory(tree.id);
      setHistory(treeHistory);
    } else {
      setTreeData({ error: "Дерево не найдено в базе", id: data });
      setHistory([]);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setTreeData(null);
    setHistory([]); // Очищаем историю при сбросе
  };

  // Функция для кнопок действий
  const handleAction = (actionName: string) => {
    if (!treeData) return;

    // Вызываем нашу новую крутую функцию
    const result = addCareRecord(treeData.id, actionName);

    if (result.success) {
      // Обновляем статус на экране
      setTreeData({ ...treeData, status: result.newStatus });
      // Добавляем новую запись в начало списка истории на экране
      setHistory([{ id: Date.now(), action: actionName, date_time: result.dateTime }, ...history]);
      Vibration.vibrate();
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
            <Text style={styles.instruction}>Наведи на QR-код дерева</Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {treeData?.error ? (
            <View style={styles.cardError}>
              <Text style={styles.errorText}>⚠️ Неизвестное дерево</Text>
              <Text style={styles.subText}>QR код: {treeData.id}</Text>
              <Text style={styles.subText}>(Этого кода нет в локальной SQLite)</Text>
            </View>
          ) : (
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <Text style={styles.title}>{treeData.name}</Text>

                <View style={styles.row}>
                  <Text style={styles.label}>📅 Посажено:</Text>
                  <Text style={styles.value}>{treeData.planted_date}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>📍 Место:</Text>
                  <Text style={styles.value}>{treeData.location}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>❤️ Статус:</Text>
                  <Text style={[styles.status, treeData.status.includes('Полив') ? { color: 'green' } : {}]}>
                    {treeData.status}
                  </Text>
                </View>

                {/* Кнопки действий */}
                <View style={styles.actionsContainer}>
                  <Text style={styles.actionsTitle}>Выполнить действие:</Text>
                  <View style={styles.buttonsRow}>
                    <Button title="💧 Полив" onPress={() => handleAction('Полив')} color="#3498db" />
                    <Button title="✂️ Обрезка" onPress={() => handleAction('Обрезка')} color="#e67e22" />
                    <Button title="💊 Лечение" onPress={() => handleAction('Лечение')} color="#e74c3c" />
                  </View>
                </View>
              </View>

              {/* НОВЫЙ БЛОК: ИСТОРИЯ УХОДА */}
              <View style={styles.historyCard}>
                <Text style={styles.historyTitle}>📋 История ухода</Text>
                {history.length === 0 ? (
                  <Text style={styles.emptyHistory}>Действий пока не было</Text>
                ) : (
                  history.map((item, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.historyAction}>
                        {item.action === 'Полив' ? '💧' : item.action === 'Обрезка' ? '✂️' : '💊'} {item.action}
                      </Text>
                      <Text style={styles.historyDate}>{item.date_time}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
          <Button title="Сканировать снова" onPress={handleReset} />

        </View>

      )}
    </SafeAreaView>
  );
}

// Стили оставляем те же, можно чуть подправить цвета
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  permissionText: { marginBottom: 20, fontSize: 18 },
  cameraContainer: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#00FF00', backgroundColor: 'transparent', marginBottom: 20 },
  instruction: { color: '#fff', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 5 },
  resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  card: { width: '100%', padding: 20, backgroundColor: '#fff', borderRadius: 15, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  cardError: { width: '100%', padding: 20, backgroundColor: '#ffebee', borderRadius: 15, marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#2c3e50', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 8 },
  label: { fontSize: 16, color: '#7f8c8d' },
  value: { fontSize: 16, fontWeight: '500', color: '#2c3e50', maxWidth: '60%', textAlign: 'right' },
  status: { fontSize: 16, fontWeight: 'bold' },
  errorText: { fontSize: 20, color: '#c0392b', fontWeight: 'bold' },
  subText: { fontSize: 16, color: '#7f8c8d', marginTop: 5 },
  actionsContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionsTitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 10,
    textAlign: 'center'
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  historyCard: {
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5
  },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 10 },
  historyAction: { fontSize: 16, fontWeight: '500', color: '#34495e' },
  historyDate: { fontSize: 14, color: '#7f8c8d' },
  emptyHistory: { fontSize: 14, color: '#bdc3c7', fontStyle: 'italic', textAlign: 'center' }
});