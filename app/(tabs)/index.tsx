import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Button, FlatList, Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';

import { addSectorRecord, getAllSectors, getSectorByQR, getSectorHistory, transferTrees } from '@/services/db';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [sectorData, setSectorData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [affectedCountStr, setAffectedCountStr] = useState<string>('0');

  const [isTransferModalVisible, setTransferModalVisible] = useState(false);
  const [availableSectors, setAvailableSectors] = useState<any[]>([]);

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

    const sector = getSectorByQR(data) as any;

    if (sector) {
      setSectorData(sector);
      // Защита от пустых значений из БД
      setAffectedCountStr(sector.total_count ? sector.total_count.toString() : '0');
      const sectorHistory = getSectorHistory(sector.qr_code) as any[];
      setHistory(sectorHistory);

      const allSectors = getAllSectors() as any[];
      setAvailableSectors(allSectors.filter(s => s.qr_code !== sector.qr_code));
    } else {
      setSectorData({ error: "Сектор не найден в базе", id: data });
      setHistory([]);
    }
  };

  const handleReset = () => {
    setScanned(false);
    setSectorData(null);
    setHistory([]);
  };

  const handleAction = (actionName: string) => {
    if (!sectorData || !sectorData.qr_code) return; // 🛡️ ЗАЩИТНАЯ ПРОВЕРКА

    const count = parseInt(affectedCountStr, 10);

    if (isNaN(count) || count <= 0) {
      Alert.alert('Ошибка', 'Введите корректное количество саженцев');
      return;
    }

    const result = addSectorRecord(sectorData.qr_code, actionName, count);

    if (result?.success) {
      setSectorData({ ...sectorData, status: result.newStatus });
      setHistory([{ id: Date.now(), action: actionName, affected_count: count, date_time: result.dateTime, photo_uri: null }, ...history]);
      Vibration.vibrate();
      Alert.alert("Успех", `Действие "${actionName}" записано для ${count} шт.`);
    }
  };

  const openTransferModal = () => {
    if (!sectorData || !sectorData.qr_code) return; // 🛡️ ЗАЩИТНАЯ ПРОВЕРКА

    const count = parseInt(affectedCountStr, 10);
    if (isNaN(count) || count <= 0) {
      Alert.alert('Ошибка', 'Введите количество саженцев для пересадки'); return;
    }

    // Безопасная проверка количества
    if (count > (sectorData.total_count || 0)) {
      Alert.alert('Ошибка', `На участке всего ${sectorData.total_count || 0} шт. Вы не можете пересадить ${count}!`); return;
    }
    setTransferModalVisible(true);
  };

  const executeTransfer = (targetSectorQr: string) => {
    if (!sectorData || !sectorData.qr_code) return; // 🛡️ ЗАЩИТНАЯ ПРОВЕРКА

    const count = parseInt(affectedCountStr, 10);
    const result = transferTrees(sectorData.qr_code, targetSectorQr, count);

    if (result.success) {
      setTransferModalVisible(false);
      Vibration.vibrate();
      Alert.alert('Успех', `Пересажено ${count} шт. в сектор "${result.toSectorName}"`);

      setSectorData({ ...sectorData, total_count: result.newCount });
      setHistory([{
        id: Date.now(),
        action: `↗️ Пересадка в: ${result.toSectorName}`,
        affected_count: count,
        date_time: result.dateTime,
        photo_uri: null
      }, ...history]);
    } else {
      Alert.alert('Ошибка', result.message || 'Не удалось пересадить');
    }
  };

  const handlePhotoProblem = async () => {
    if (!sectorData || !sectorData.qr_code) return; // 🛡️ ЗАЩИТНАЯ ПРОВЕРКА

    const count = parseInt(affectedCountStr, 10);
    if (isNaN(count) || count <= 0) return;

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });

    if (!result.canceled) {
      const photoUri = result.assets[0].uri;
      const record = addSectorRecord(sectorData.qr_code, '⚠️ Проблема/Списание', count, photoUri);
      if (record?.success) {
        setSectorData({ ...sectorData, status: record.newStatus });
        setHistory([{ id: Date.now(), action: '⚠️ Проблема/Списание', affected_count: count, date_time: record.dateTime, photo_uri: photoUri }, ...history]);
        Vibration.vibrate();
      }
    }
  };

  const actionButtons = [
    { name: 'Полив', icon: '💧', color: '#2980b9', bg: '#e3f2fd' },
    { name: 'Удобрение', icon: '🧪', color: '#d35400', bg: '#fef5e7' },
    { name: 'Обрезка', icon: '✂️', color: '#8e44ad', bg: '#f4ecf8' },
    { name: 'Формовка', icon: '🌳', color: '#27ae60', bg: '#e8f8f5' },
    { name: 'Прополка', icon: '🌿', color: '#16a085', bg: '#d1f2eb' },
    { name: 'Обработка', icon: '🐛', color: '#c0392b', bg: '#fdedec' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {!scanned ? (
        <View style={styles.cameraContainer}>
          <CameraView style={StyleSheet.absoluteFillObject} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.instruction}>Наведите камеру на QR-код таблички</Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {sectorData?.error ? (
            <View style={styles.cardError}>
              <Text style={styles.errorText}>⚠️ Неизвестный QR-код</Text>
              <Text style={styles.subText}>ID: {sectorData.id}</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
                <Text style={styles.primaryButtonText}>Сканировать снова</Text>
              </TouchableOpacity>
            </View>
          ) : sectorData ? ( // 🛡️ Еще одна защита: рендерим карточку только если данные есть
            <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{sectorData.name}</Text>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>🌳 Порода:</Text>
                    <Text style={styles.value}>{sectorData.tree_type}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>📦 Остаток:</Text>
                    <Text style={[styles.value, { color: '#2980b9', fontSize: 18 }]}>{sectorData.total_count} шт.</Text>
                  </View>
                </View>

                <View style={styles.countInputContainer}>
                  <Text style={styles.countInputLabel}>Сколько саженцев обрабатываем?</Text>
                  <View style={styles.countInputWrapper}>
                    <TextInput
                      style={styles.countInput}
                      keyboardType="numeric"
                      value={affectedCountStr}
                      onChangeText={setAffectedCountStr}
                      selectTextOnFocus
                    />
                    <Text style={styles.countUnit}>шт.</Text>
                  </View>
                </View>

                <Text style={styles.actionsTitle}>Быстрые действия:</Text>

                <View style={styles.actionGrid}>
                  {actionButtons.map((btn, idx) => (
                    <TouchableOpacity key={idx} style={[styles.actionBtn, { backgroundColor: btn.bg }]} onPress={() => handleAction(btn.name)}>
                      <Text style={styles.actionBtnEmoji}>{btn.icon}</Text>
                      <Text style={[styles.actionBtnText, { color: btn.color }]}>{btn.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.transferButton} onPress={openTransferModal}>
                  <Text style={styles.transferButtonText}>🔄 Пересадить в другой сектор</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dangerButton} onPress={handlePhotoProblem}>
                  <Text style={styles.dangerButtonText}>📸 Списать / Болезнь</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.historyMainTitle}>Журнал участка</Text>
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
                          <Text style={styles.historyAction}>{item.action}</Text>
                          <Text style={styles.historyDate}>{item.date_time}</Text>
                        </View>
                        <Text style={styles.affectedCountText}>Затронуто: <Text style={{ fontWeight: 'bold' }}>{item.affected_count} шт.</Text></Text>
                        {item.photo_uri ? <Image source={{ uri: item.photo_uri }} style={styles.historyImage} /> : null}
                      </View>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
                <Text style={styles.primaryButtonText}>📷 Следующий сектор</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : null}
        </View>
      )}

      <Modal visible={isTransferModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Куда пересадить {affectedCountStr} шт.?</Text>
            <Text style={styles.modalSub}>Выберите участок назначения:</Text>

            <FlatList
              data={availableSectors}
              keyExtractor={(item) => item.qr_code}
              style={{ maxHeight: 300, marginVertical: 15 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.sectorListItem} onPress={() => executeTransfer(item.qr_code)}>
                  <View>
                    <Text style={styles.sectorListTitle}>{item.name}</Text>
                    <Text style={styles.sectorListSub}>{item.tree_type}</Text>
                  </View>
                  <Text style={styles.sectorListCount}>{item.total_count} шт.</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#7f8c8d' }}>В базе больше нет участков.</Text>}
            />

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTransferModalVisible(false)}>
              <Text style={styles.modalCancelBtnText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... стили остались без изменений ...
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  permissionText: { marginBottom: 20, fontSize: 18, color: '#2c3e50' },
  cameraContainer: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 260, height: 260, borderWidth: 3, borderColor: '#2ecc71', borderRadius: 20, backgroundColor: 'transparent', marginBottom: 20 },
  instruction: { color: '#fff', fontSize: 16, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  resultContainer: { flex: 1, padding: 15, backgroundColor: '#f4f6f8' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20 },
  cardError: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', marginTop: '50%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#2c3e50', flex: 1, marginRight: 10 },

  infoGrid: { backgroundColor: '#f8f9fa', borderRadius: 16, padding: 15, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14, color: '#7f8c8d', fontWeight: '600' },
  value: { fontSize: 14, color: '#2c3e50', fontWeight: '700' },

  countInputContainer: { backgroundColor: '#fffbe6', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#fef5e7' },
  countInputLabel: { fontSize: 14, fontWeight: '700', color: '#d35400', marginBottom: 10 },
  countInputWrapper: { flexDirection: 'row', alignItems: 'center' },
  countInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f39c12', borderRadius: 12, padding: 12, fontSize: 18, fontWeight: 'bold', color: '#d35400', textAlign: 'center' },
  countUnit: { fontSize: 16, fontWeight: '700', color: '#d35400', marginLeft: 10 },

  actionsTitle: { fontSize: 16, fontWeight: '700', color: '#34495e', marginBottom: 12 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  actionBtn: { width: '31%', paddingVertical: 12, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  actionBtnEmoji: { fontSize: 24, marginBottom: 4 },
  actionBtnText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },

  transferButton: { backgroundColor: '#f0f3f4', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#bdc3c7', marginBottom: 10 },
  transferButtonText: { color: '#2c3e50', fontSize: 15, fontWeight: '700' },

  dangerButton: { backgroundColor: '#feeceb', paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fadbd8' },
  dangerButtonText: { color: '#e74c3c', fontSize: 15, fontWeight: '700' },
  primaryButton: { backgroundColor: '#27ae60', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  historyMainTitle: { fontSize: 20, fontWeight: '800', color: '#2c3e50', marginBottom: 15, marginLeft: 5 },
  historyContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20 },
  historyItem: { flexDirection: 'row', minHeight: 60 },
  historyTimeline: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2ecc71', marginTop: 5, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#eaeded', position: 'absolute', top: 17, bottom: -5, zIndex: 1 },
  historyContent: { flex: 1, paddingBottom: 20, paddingLeft: 10 },
  historyTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyAction: { fontSize: 15, fontWeight: '700', color: '#34495e' },
  historyDate: { fontSize: 13, color: '#95a5a6', fontWeight: '500' },
  affectedCountText: { fontSize: 14, color: '#e67e22', marginBottom: 8 },
  historyImage: { width: '100%', height: 180, borderRadius: 16, marginTop: 8, backgroundColor: '#f4f6f8' },
  emptyHistory: { fontSize: 15, color: '#bdc3c7', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  errorText: { fontSize: 22, color: '#c0392b', fontWeight: '800', marginBottom: 10 },
  subText: { fontSize: 16, color: '#7f8c8d', marginBottom: 30 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 24, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#2c3e50', textAlign: 'center', marginBottom: 5 },
  modalSub: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 10 },
  sectorListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eaeded' },
  sectorListTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  sectorListSub: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  sectorListCount: { fontSize: 16, fontWeight: '800', color: '#2980b9' },
  modalCancelBtn: { backgroundColor: '#ecf0f1', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  modalCancelBtnText: { color: '#7f8c8d', fontSize: 16, fontWeight: '700' },
});