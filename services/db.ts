import { supabase } from '@/supabaseClient';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
// Открываем (или создаем) файл базы данных 'trees.db' на телефоне
const db = SQLite.openDatabaseSync('trees_v4.db');

// 1. Инициализация таблиц
export const initDB = () => {
    try {
      // Таблица деревьев
      db.execSync(`
        CREATE TABLE IF NOT EXISTS trees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qr_code TEXT UNIQUE,
          name TEXT,
          planted_date TEXT,
          location TEXT,
          status TEXT,
          lat REAL,
          lng REAL,
          is_synced INTEGER DEFAULT 0 -- НОВЫЙ ФЛАГ
        );
      `);
      
      db.execSync(`
        CREATE TABLE IF NOT EXISTS care_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tree_id INTEGER,
          tree_qr TEXT, -- НОВОЕ: сохраняем QR для удобной связки с сервером
          action TEXT,
          date_time TEXT,
          photo_uri TEXT,
          is_synced INTEGER DEFAULT 0 -- НОВЫЙ ФЛАГ
        );
      `);
      console.log('Таблицы готовы');
    } catch (error) {
      console.error('Ошибка при создании таблиц:', error);
    }
  };

// 2. Добавление тестовых данных (чтобы было что сканировать)
export const seedDatabase = () => {
  try {
    // Проверяем, есть ли уже записи, чтобы не дублировать
    const result = db.getAllSync('SELECT count(*) as count FROM trees');
    // @ts-ignore
    if (result[0].count === 0) {
      console.log('База пуста, заполняем тестовыми данными...');
      db.execSync(`
        INSERT INTO trees (qr_code, name, planted_date, location, status) VALUES 
        ('tree_001', 'Ель Голубая (Picea pungens)', '2020-05-15', 'Сектор А, ряд 4', 'Здорово'),
        ('tree_002', 'Береза Повислая', '2019-10-10', 'Сектор Б, ряд 1', 'Требует полива'),
        ('tree_003', 'Дуб Черешчатый', '2018-04-20', 'Аллея Славы', 'Болезнь листвы');
      `);
    }
  } catch (error) {
    console.error('Ошибка при заполнении:', error);
  }
};

// 3. Поиск дерева по QR-коду
export const getTreeByQR = (qrCode: string) => {
  try {
    const result = db.getFirstSync('SELECT * FROM trees WHERE qr_code = ?', [qrCode]);
    return result;
  } catch (error) {
    console.error('Ошибка поиска:', error);
    return null;
  }
};

export const addTree = (qr_code: string, name: string, location: string, status: string, lat: number | null, lng: number | null) => {
    try {
      const planted_date = new Date().toISOString().split('T')[0];
      db.runSync(
        `INSERT INTO trees (qr_code, name, planted_date, location, status, lat, lng, is_synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [qr_code, name, planted_date, location, status, lat, lng]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error };
    }
  };

  export const updateTreeStatus = (id: number, newStatus: string) => {
    try {
      db.runSync(
        `UPDATE trees SET status = ? WHERE id = ?`,
        [newStatus, id]
      );
      return true;
    } catch (error) {
      console.error('Ошибка обновления:', error);
      return false;
    }
  };
  // 6. Получение всех деревьев (с сортировкой от новых к старым)
export const getAllTrees = () => {
    try {
      return db.getAllSync('SELECT * FROM trees ORDER BY id DESC');
    } catch (error) {
      console.error('Ошибка получения списка:', error);
      return [];
    }
  };

// Запись действия в историю (с фото и QR-кодом для синхронизации)
export const addCareRecord = (treeId: number, treeQr: string, actionName: string, photoUri: string | null = null) => {
    try {
      const now = new Date();
      const dateTime = now.toLocaleString('ru-RU', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
  
      // Сохраняем историю с путем к фото
      db.runSync(
        `INSERT INTO care_history (tree_id, tree_qr, action, date_time, photo_uri, is_synced) VALUES (?, ?, ?, ?, ?, 0)`,
        [treeId, treeQr, actionName, dateTime, photoUri]
      );
  
      const shortStatus = `${actionName} (${now.toLocaleDateString('ru-RU')})`;
      db.runSync(`UPDATE trees SET status = ?, is_synced = 0 WHERE id = ?`, [shortStatus, treeId]);
  
      return { success: true, newStatus: shortStatus, dateTime };
    } catch (error) {
      console.error('Ошибка записи истории:', error);
      return { success: false };
    }
  };
  
  // 8. Получение истории конкретного дерева
  export const getTreeHistory = (treeId: number) => {
    try {
      return db.getAllSync('SELECT * FROM care_history WHERE tree_id = ? ORDER BY id DESC', [treeId]);
    } catch (error) {
      console.error('Ошибка получения истории:', error);
      return [];
    }
  };

 // 9. ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ С СЕРВЕРОМ (С ФОТОГРАФИЯМИ)
export const syncDataWithServer = async () => {
    try {
      // @ts-ignore
      const unsyncedTrees = db.getAllSync('SELECT * FROM trees WHERE is_synced = 0');
      // @ts-ignore
      const unsyncedHistory = db.getAllSync('SELECT * FROM care_history WHERE is_synced = 0');
  
      if (unsyncedTrees.length === 0 && unsyncedHistory.length === 0) {
        return { success: true, message: 'Все данные уже на сервере.' };
      }
  
      // --- 1. ОТПРАВЛЯЕМ ДЕРЕВЬЯ ---
      if (unsyncedTrees.length > 0) {
        const treesToPush = unsyncedTrees.map((t: any) => ({
          qr_code: t.qr_code, name: t.name, location: t.location,
          planted_date: t.planted_date, status: t.status, lat: t.lat, lng: t.lng
        }));
  
        const { error: treeError } = await supabase.from('trees').upsert(treesToPush);
        if (treeError) throw treeError;
  
        db.runSync('UPDATE trees SET is_synced = 1 WHERE is_synced = 0');
      }
  
      // --- 2. ОТПРАВЛЯЕМ ИСТОРИЮ И ФОТО ---
      if (unsyncedHistory.length > 0) {
        const historyToPush = [];
  
        for (const h of unsyncedHistory as any[]) {
          let finalPhotoUri = h.photo_uri;
  
          // ПЕРЕХВАТЧИК: Если есть фото с Айфона
          if (finalPhotoUri && finalPhotoUri.startsWith('file://')) {
            try {
              console.log("Грузим фото на сервер...");
              // 1. Читаем файл как текст (base64)
              const base64 = await FileSystem.readAsStringAsync(finalPhotoUri, { encoding: 'base64' });
              
              // 2. Генерируем уникальное имя файла
              const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
  
              // 3. Отправляем в Storage (бакет tree_photos)
              const { error: uploadError } = await supabase.storage
                .from('tree_photos')
                .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
  
              if (uploadError) {
                console.error("Ошибка Storage:", uploadError);
                throw uploadError;
              }
  
              // 4. Получаем публичную веб-ссылку
              const { data: publicUrlData } = supabase.storage
                .from('tree_photos')
                .getPublicUrl(fileName);
  
              // 5. Заменяем локальный file:// на облачный https://
              finalPhotoUri = publicUrlData.publicUrl;
              console.log("Успех! Ссылка:", finalPhotoUri);
              
            } catch (uploadErr) {
              console.error('Ошибка загрузки фото, отправляем без него:', uploadErr);
            }
          }
  
          historyToPush.push({
            tree_qr: h.tree_qr,
            action: h.action,
            date_time: h.date_time,
            photo_uri: finalPhotoUri // Сюда ляжет правильная ссылка
          });
        }
  
        // Отправляем готовую историю в PostgreSQL
        const { error: historyError } = await supabase.from('care_history').insert(historyToPush);
        if (historyError) throw historyError;
  
        db.runSync('UPDATE care_history SET is_synced = 1 WHERE is_synced = 0');
      }
  
      return { 
        success: true, 
        message: `Синхронизировано: ${unsyncedTrees.length} деревьев, ${unsyncedHistory.length} записей.` 
      };
  
    } catch (error: any) {
      console.error('Сбой синхронизации:', error.message);
      return { success: false, message: 'Ошибка связи с сервером.' };
    }
  };