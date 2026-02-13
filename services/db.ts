import * as SQLite from 'expo-sqlite';

// Открываем (или создаем) файл базы данных 'trees.db' на телефоне
const db = SQLite.openDatabaseSync('trees.db');

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
          status TEXT
        );
      `);
      
      // НОВАЯ: Таблица истории ухода
      db.execSync(`
        CREATE TABLE IF NOT EXISTS care_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tree_id INTEGER,
          action TEXT,
          date_time TEXT
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

export const addTree = (qr_code: string, name: string, location: string, status: string) => {
    try {
      const planted_date = new Date().toISOString().split('T')[0]; // Текущая дата YYYY-MM-DD
      
      const result = db.runSync(
        `INSERT INTO trees (qr_code, name, planted_date, location, status) VALUES (?, ?, ?, ?, ?)`,
        [qr_code, name, planted_date, location, status]
      );
      return { success: true, id: result.lastInsertRowId };
    } catch (error) {
      console.error('Ошибка добавления:', error);
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

  export const addCareRecord = (treeId: number, actionName: string) => {
    try {
      const now = new Date();
      // Форматируем дату и время, например: "13.02.2026, 14:30"
      const dateTime = now.toLocaleString('ru-RU', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
  
      // 1. Добавляем запись в лог истории
      db.runSync(
        `INSERT INTO care_history (tree_id, action, date_time) VALUES (?, ?, ?)`,
        [treeId, actionName, dateTime]
      );
  
      // 2. Параллельно обновляем текущий статус у самого дерева
      const shortStatus = `${actionName} (${now.toLocaleDateString('ru-RU')})`;
      db.runSync(
        `UPDATE trees SET status = ? WHERE id = ?`,
        [shortStatus, treeId]
      );
  
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