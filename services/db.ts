import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { supabase } from '../supabaseClient';

// 🆕 База v2 с новыми полями
const db = SQLite.openDatabaseSync('zelenstroy_sectors_v2.db'); 

export const initDB = () => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS sectors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          qr_code TEXT UNIQUE,
          name TEXT,
          tree_type TEXT,
          total_count INTEGER,
          planted_date TEXT,
          status TEXT,
          lat REAL,
          lng REAL,
          age TEXT,              -- 🆕 Возраст
          growing_school TEXT,   -- 🆕 Школа
          height TEXT,           -- 🆕 Высота
          root_ball_size TEXT,   -- 🆕 Ком
          plant_type TEXT,       -- 🆕 Вид
          is_synced INTEGER DEFAULT 0
        );
      `);
      
      db.execSync(`
        CREATE TABLE IF NOT EXISTS sector_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sector_qr TEXT,
          action TEXT,
          affected_count INTEGER,
          date_time TEXT,
          photo_uri TEXT,
          is_synced INTEGER DEFAULT 0
        );
      `);
      console.log('Таблицы секторов v2 готовы');
    } catch (error) {
      console.error('Ошибка создания таблиц:', error);
    }
};

initDB();

export const getSectorByQR = (qrCode: string) => {
  try {
    return db.getFirstSync('SELECT * FROM sectors WHERE qr_code = ?', [qrCode]);
  } catch (error) {
    console.error('Ошибка поиска:', error);
    return null;
  }
};

// 🆕 Обновленная функция добавления (принимает 12 параметров)
export const addSector = (
  qr_code: string, name: string, tree_type: string, total_count: number, 
  status: string, lat: number | null, lng: number | null,
  age: string, growing_school: string, height: string, root_ball_size: string, plant_type: string
) => {
    try {
      const planted_date = new Date().toISOString().split('T')[0];
      db.runSync(
        `INSERT INTO sectors (qr_code, name, tree_type, total_count, planted_date, status, lat, lng, age, growing_school, height, root_ball_size, plant_type, is_synced) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [qr_code, name, tree_type, total_count, planted_date, status, lat, lng, age, growing_school, height, root_ball_size, plant_type]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error };
    }
};

export const getAllSectors = () => {
    try {
      return db.getAllSync('SELECT * FROM sectors ORDER BY id DESC');
    } catch (error) {
      console.error('Ошибка получения списка:', error);
      return [];
    }
};

export const addSectorRecord = (sectorQr: string, actionName: string, affectedCount: number, photoUri: string | null = null) => {
    try {
      const now = new Date();
      const dateTime = now.toLocaleString('ru-RU', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
  
      db.runSync(
        `INSERT INTO sector_history (sector_qr, action, affected_count, date_time, photo_uri, is_synced) VALUES (?, ?, ?, ?, ?, 0)`,
        [sectorQr, actionName, affectedCount, dateTime, photoUri]
      );
  
      const shortStatus = `${actionName} (${now.toLocaleDateString('ru-RU')})`;
      db.runSync(`UPDATE sectors SET status = ?, is_synced = 0 WHERE qr_code = ?`, [shortStatus, sectorQr]);
  
      return { success: true, newStatus: shortStatus, dateTime };
    } catch (error) {
      console.error('Ошибка записи истории:', error);
      return { success: false };
    }
};
  
export const getSectorHistory = (sectorQr: string) => {
    try {
      return db.getAllSync('SELECT * FROM sector_history WHERE sector_qr = ? ORDER BY id DESC', [sectorQr]);
    } catch (error) {
      console.error('Ошибка получения истории:', error);
      return [];
    }
};

// 🆕 Обновленная Синхронизация (отправляет новые поля в облако)
export const syncDataWithServer = async () => {
    try {
      const unsyncedSectors = db.getAllSync('SELECT * FROM sectors WHERE is_synced = 0');
      const unsyncedHistory = db.getAllSync('SELECT * FROM sector_history WHERE is_synced = 0');
  
      if (unsyncedSectors.length === 0 && unsyncedHistory.length === 0) {
        return { success: true, message: 'Все данные уже на сервере.' };
      }
  
      if (unsyncedSectors.length > 0) {
        const sectorsToPush = unsyncedSectors.map((s: any) => ({
          qr_code: s.qr_code, name: s.name, tree_type: s.tree_type, total_count: s.total_count,
          planted_date: s.planted_date, status: s.status, lat: s.lat, lng: s.lng,
          age: s.age, growing_school: s.growing_school, height: s.height, root_ball_size: s.root_ball_size, plant_type: s.plant_type
        }));
  
        const { error: sectorError } = await supabase.from('sectors').upsert(sectorsToPush, { onConflict: 'qr_code' });
        if (sectorError) throw sectorError;
  
        db.runSync('UPDATE sectors SET is_synced = 1 WHERE is_synced = 0');
      }
  
      if (unsyncedHistory.length > 0) {
        const historyToPush = [];
  
        for (const h of unsyncedHistory as any[]) {
          let finalPhotoUri = h.photo_uri;
  
          if (finalPhotoUri && finalPhotoUri.startsWith('file://')) {
            try {
              const base64 = await FileSystem.readAsStringAsync(finalPhotoUri, { encoding: 'base64' });
              const fileName = `sector_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
  
              const { error: uploadError } = await supabase.storage
                .from('tree_photos')
                .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
  
              if (!uploadError) {
                const { data: publicUrlData } = supabase.storage.from('tree_photos').getPublicUrl(fileName);
                finalPhotoUri = publicUrlData.publicUrl;
              }
            } catch (uploadErr) {
              console.error('Ошибка загрузки фото:', uploadErr);
            }
          }
  
          historyToPush.push({
            sector_qr: h.sector_qr, action: h.action, affected_count: h.affected_count,
            date_time: h.date_time, photo_uri: finalPhotoUri
          });
        }
  
        const { error: historyError } = await supabase.from('sector_history').insert(historyToPush);
        if (historyError) throw historyError;
  
        db.runSync('UPDATE sector_history SET is_synced = 1 WHERE is_synced = 0');
      }
  
      return { success: true, message: `Синхронизировано: ${unsyncedSectors.length} секторов, ${unsyncedHistory.length} записей.` };
    } catch (error: any) {
      console.error('Сбой синхронизации:', error.message);
      return { success: false, message: 'Ошибка связи с сервером.' };
    }
};

// 🆕 Обновленное Скачивание (принимает новые поля из облака)
export const downloadDataFromServer = async () => {
  try {
    const { data: sectors, error: sectorsError } = await supabase.from('sectors').select('*');
    if (sectorsError) throw sectorsError;

    if (sectors && sectors.length > 0) {
      for (const s of sectors) {
        db.runSync(
          `INSERT OR REPLACE INTO sectors (qr_code, name, tree_type, total_count, planted_date, status, lat, lng, age, growing_school, height, root_ball_size, plant_type, is_synced) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [s.qr_code, s.name, s.tree_type, s.total_count, s.planted_date, s.status, s.lat, s.lng, s.age, s.growing_school, s.height, s.root_ball_size, s.plant_type]
        );
      }
    }

    const { data: history, error: historyError } = await supabase.from('sector_history').select('*');
    if (historyError) throw historyError;

    if (history && history.length > 0) {
      db.runSync('DELETE FROM sector_history WHERE is_synced = 1');

      for (const h of history) {
        db.runSync(
          `INSERT INTO sector_history (sector_qr, action, affected_count, date_time, photo_uri, is_synced) 
           VALUES (?, ?, ?, ?, ?, 1)`,
          [h.sector_qr, h.action, h.affected_count, h.date_time, h.photo_uri]
        );
      }
    }

    return { success: true, message: `Скачано: ${sectors?.length || 0} секторов и ${history?.length || 0} записей.` };
  } catch (error: any) {
    console.error('Ошибка загрузки с сервера:', error.message);
    return { success: false, message: 'Ошибка связи с сервером. Проверьте интернет.' };
  }
};

export const transferTrees = (fromQr: string, toQr: string, count: number) => {
  try {
    const fromSector = db.getFirstSync('SELECT * FROM sectors WHERE qr_code = ?', [fromQr]) as any;
    const toSector = db.getFirstSync('SELECT * FROM sectors WHERE qr_code = ?', [toQr]) as any;

    if (!fromSector || !toSector) return { success: false, message: 'Сектор не найден' };

    const now = new Date();
    const dateTime = now.toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    // 1. Высчитываем новые остатки
    const newFromCount = fromSector.total_count - count;
    const newToCount = toSector.total_count + count;

    // 2. Обновляем количество в обоих секторах
    db.runSync(`UPDATE sectors SET total_count = ?, is_synced = 0 WHERE qr_code = ?`, [newFromCount, fromQr]);
    db.runSync(`UPDATE sectors SET total_count = ?, is_synced = 0 WHERE qr_code = ?`, [newToCount, toQr]);

    // 3. Записываем в историю ПЕРВОМУ сектору (Убытие)
    db.runSync(`INSERT INTO sector_history (sector_qr, action, affected_count, date_time, photo_uri, is_synced) VALUES (?, ?, ?, ?, ?, 0)`, 
      [fromQr, `↗️ Пересадка в: ${toSector.name}`, count, dateTime, null]);
      
    // 4. Записываем в историю ВТОРОМУ сектору (Прибытие)
    db.runSync(`INSERT INTO sector_history (sector_qr, action, affected_count, date_time, photo_uri, is_synced) VALUES (?, ?, ?, ?, ?, 0)`, 
      [toQr, `↙️ Пересадка из: ${fromSector.name}`, count, dateTime, null]);

    return { success: true, newCount: newFromCount, dateTime, toSectorName: toSector.name };
  } catch (error) {
    console.error('Ошибка пересадки:', error);
    return { success: false, message: 'Ошибка БД' };
  }
};