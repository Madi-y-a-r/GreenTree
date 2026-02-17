import { downloadDataFromServer, getAllSectors, syncDataWithServer } from '@/services/db';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ListScreen() {
    const [sectors, setSectors] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const loadSectors = () => {
        const data = getAllSectors();
        setSectors(data);
    };

    useFocusEffect(
        useCallback(() => {
            loadSectors();
        }, [])
    );

    const handleDownload = async () => {
        setIsDownloading(true);
        const result = await downloadDataFromServer();
        setIsDownloading(false);
        Alert.alert(result.success ? 'Успех' : 'Ошибка', result.message);
        loadSectors();
    };

    const handleSync = async () => {
        setIsSyncing(true);
        const result = await syncDataWithServer();
        setIsSyncing(false);
        Alert.alert(result.success ? 'Успех' : 'Ошибка', result.message);
        loadSectors();
    };

    const renderSectorItem = ({ item }: { item: any }) => {
        const isProblem = item.status?.includes('Проблема') || item.status?.includes('Болезнь');

        return (
            <View style={styles.treeCard}>
                <View style={styles.cardHeader}>
                    <Text style={styles.treeName}>{item.name}</Text>
                    <View style={[styles.statusBadge, isProblem ? styles.badgeRed : styles.badgeGreen]}>
                        <Text style={[styles.statusText, isProblem ? styles.textRed : styles.textGreen]}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.infoText}>🌳 Порода: <Text style={{ fontWeight: '700' }}>{item.tree_type}</Text></Text>
                    <Text style={styles.infoText}>📦 Количество: <Text style={{ fontWeight: '700', color: '#2980b9' }}>{item.total_count} шт.</Text></Text>
                    <Text style={styles.infoText}>📅 Посадка: {item.planted_date}</Text>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.qrText}>ID: {item.qr_code}</Text>
                    {item.is_synced === 1 ? (
                        <Text style={styles.syncIconSuccess}>☁️ В облаке</Text>
                    ) : (
                        <Text style={styles.syncIconWait}>⏳ Ждет отправки</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>База секторов</Text>
                <Text style={styles.headerSub}>Всего участков: {sectors.length}</Text>
            </View>

            <View style={styles.controlPanel}>
                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#e3f2fd' }]} onPress={handleDownload} disabled={isDownloading}>
                    {isDownloading ? <ActivityIndicator color="#2980b9" /> : <Text style={styles.controlBtnText}>⬇️ Скачать базу</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#e8f8f5' }]} onPress={handleSync} disabled={isSyncing}>
                    {isSyncing ? <ActivityIndicator color="#27ae60" /> : <Text style={[styles.controlBtnText, { color: '#27ae60' }]}>☁️ Отправить</Text>}
                </TouchableOpacity>
            </View>

            {sectors.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>База пуста.</Text>
                    <Text style={styles.emptySubText}>Добавьте сектор или скачайте базу из облака.</Text>
                </View>
            ) : (
                <FlatList
                    data={sectors}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSectorItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#2c3e50' },
    headerSub: { fontSize: 15, color: '#7f8c8d', marginTop: 5 },
    controlPanel: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, justifyContent: 'space-between' },
    controlBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginHorizontal: 5 },
    controlBtnText: { color: '#2980b9', fontSize: 15, fontWeight: '700' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    treeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    treeName: { fontSize: 18, fontWeight: '800', color: '#2c3e50', flex: 1, marginRight: 10 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    badgeGreen: { backgroundColor: '#e8f8f5' },
    badgeRed: { backgroundColor: '#fdedec' },
    statusText: { fontSize: 12, fontWeight: '700' },
    textGreen: { color: '#27ae60' },
    textRed: { color: '#e74c3c' },
    cardBody: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, marginBottom: 12 },
    infoText: { fontSize: 14, color: '#34495e', marginBottom: 6, fontWeight: '500' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
    qrText: { fontSize: 13, color: '#95a5a6', fontWeight: 'bold', fontFamily: 'monospace' },
    syncIconSuccess: { fontSize: 12, color: '#27ae60', fontWeight: '600' },
    syncIconWait: { fontSize: 12, color: '#f39c12', fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#7f8c8d', marginBottom: 10 },
    emptySubText: { fontSize: 15, color: '#bdc3c7', textAlign: 'center' }
});