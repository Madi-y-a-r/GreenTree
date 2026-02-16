import { getAllTrees, syncDataWithServer } from '@/services/db';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
// Добавили Alert и Button в импорты!
import { ActivityIndicator, Alert, Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function ListScreen() {
    const [trees, setTrees] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // useFocusEffect обновляет список каждый раз, когда мы открываем эту вкладку
    useFocusEffect(
        useCallback(() => {
            loadTrees();
        }, [])
    );

    const loadTrees = () => {
        const data = getAllTrees();
        setTrees(data);
    };

    // Простой поиск по названию, QR-коду или локации
    const filteredTrees = trees.filter(tree =>
        tree.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.qr_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Дизайн одной карточки в списке
    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.treeName}>{item.name}</Text>
                <Text style={styles.treeId}>{item.qr_code}</Text>
            </View>
            <Text style={styles.treeInfo}>📍 {item.location}</Text>
            <Text style={styles.treeInfo}>📅 Посадка: {item.planted_date}</Text>
            <View style={styles.statusBadge}>
                <Text style={[styles.statusText, item.status.includes('Здорово') ? { color: 'green' } : { color: '#e67e22' }]}>
                    {item.status}
                </Text>
            </View>
        </View>
    );

    // Функция синхронизации с Supabase
    const handleSync = async () => {
        setIsSyncing(true);
        const result = await syncDataWithServer();
        setIsSyncing(false);

        Alert.alert(result.success ? 'Отлично!' : 'Внимание', result.message);
        loadTrees(); // Перезагружаем список
    };

    // Функция выгрузки в Excel/CSV


    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.header}>База деревьев</Text>
            <Text style={styles.subHeader}>Всего записей: {trees.length}</Text>

            {/* 👇 ВСТАВИЛИ КНОПКИ СЮДА 👇 */}
            <View style={styles.actionButtonsContainer}>
                <View style={styles.syncContainer}>
                    {isSyncing ? (
                        <ActivityIndicator size="large" color="#27ae60" />
                    ) : (
                        <Button title="☁️ Синхронизировать с БД" onPress={handleSync} color="#27ae60" />
                    )}
                </View>


            </View>
            {/* 👆 КОНЕЦ КНОПОК 👆 */}

            <TextInput
                style={styles.searchInput}
                placeholder="🔍 Поиск по названию, ID или сектору..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />

            <FlatList
                data={filteredTrees}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={<Text style={styles.emptyText}>Ничего не найдено</Text>}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f6fa' },
    header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 10, color: '#2f3640' },
    subHeader: { fontSize: 14, textAlign: 'center', color: '#7f8fa6', marginBottom: 15 },

    // Новые стили для контейнеров кнопок
    actionButtonsContainer: { paddingHorizontal: 15, marginBottom: 15 },
    syncContainer: { marginBottom: 10, borderRadius: 8, overflow: 'hidden' },
    exportContainer: { borderRadius: 8, overflow: 'hidden' },

    searchInput: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#dcdde1',
        marginBottom: 10
    },
    listContent: { paddingHorizontal: 15, paddingBottom: 20 },
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    treeName: { fontSize: 18, fontWeight: '600', color: '#2f3640', flex: 1 },
    treeId: { fontSize: 12, color: '#7f8fa6', backgroundColor: '#f1f2f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
    treeInfo: { fontSize: 14, color: '#718093', marginBottom: 4 },
    statusBadge: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f2f6' },
    statusText: { fontSize: 14, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#7f8fa6' }
});