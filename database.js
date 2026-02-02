const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'items.db');

class ItemDatabase {
  constructor() {
    this.db = null;
  }

  // 데이터베이스 연결 및 초기화
  async init() {
    try {
      this.db = new Database(DB_PATH);
      console.log('✅ SQLite 데이터베이스 연결 성공');
      
      // WAL 모드 활성화 (성능 향상)
      this.db.pragma('journal_mode = WAL');
      
      this.createTable();
      return Promise.resolve();
    } catch (err) {
      console.error('데이터베이스 연결 실패:', err);
      return Promise.reject(err);
    }
  }

  // 테이블 생성
  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        location TEXT NOT NULL,
        image TEXT,
        password TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      this.db.exec(sql);
      console.log('✅ items 테이블 준비 완료');
    } catch (err) {
      console.error('테이블 생성 실패:', err);
      throw err;
    }
  }

  // 모든 물건 조회
  async getAllItems() {
    try {
      const stmt = this.db.prepare('SELECT * FROM items ORDER BY name');
      const rows = stmt.all();
      
      // JSON 형식과 호환되도록 변환
      const items = {};
      rows.forEach(row => {
        items[row.name.toLowerCase()] = {
          location: row.location,
          image: row.image,
          updatedAt: row.updated_at
        };
      });
      
      return Promise.resolve(items);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 물건 추가/수정
  async upsertItem(name, location, image = null, password = null) {
    const nameLower = name.toLowerCase();
    
    try {
      // 먼저 존재하는지 확인
      const existing = await this.getItem(nameLower);
      
      if (existing) {
        // 업데이트 (비밀번호는 변경하지 않음)
        const stmt = this.db.prepare(`
          UPDATE items 
          SET location = ?, image = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE LOWER(name) = ?
        `);
        
        stmt.run(location, image, nameLower);
        
        return Promise.resolve({ 
          success: true, 
          name: nameLower, 
          location, 
          image,
          updated: true 
        });
      } else {
        // 삽입 (비밀번호 포함)
        const stmt = this.db.prepare(`
          INSERT INTO items (name, location, image, password) 
          VALUES (?, ?, ?, ?)
        `);
        
        const info = stmt.run(nameLower, location, image, password);
        
        return Promise.resolve({ 
          success: true, 
          name: nameLower, 
          location, 
          image,
          id: info.lastInsertRowid,
          updated: false
        });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 물건 검색
  async searchItem(query) {
    const queryLower = query.toLowerCase();
    
    try {
      // 정확한 매치 먼저
      let stmt = this.db.prepare('SELECT * FROM items WHERE LOWER(name) = ?');
      let row = stmt.get(queryLower);
      
      if (row) {
        return Promise.resolve({
          found: true,
          name: row.name.toLowerCase(),
          location: row.location,
          image: row.image
        });
      }
      
      // 부분 매치 검색
      stmt = this.db.prepare(`
        SELECT * FROM items 
        WHERE LOWER(name) LIKE ? OR ? LIKE '%' || LOWER(name) || '%'
        LIMIT 1
      `);
      row = stmt.get(`%${queryLower}%`, queryLower);
      
      if (row) {
        return Promise.resolve({
          found: true,
          name: row.name.toLowerCase(),
          location: row.location,
          image: row.image
        });
      }
      
      return Promise.resolve({ found: false });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 특정 물건 조회
  async getItem(name) {
    try {
      const stmt = this.db.prepare('SELECT * FROM items WHERE LOWER(name) = ?');
      const row = stmt.get(name.toLowerCase());
      return Promise.resolve(row || null);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 물건 삭제
  async deleteItem(name) {
    try {
      const stmt = this.db.prepare('DELETE FROM items WHERE LOWER(name) = ?');
      const info = stmt.run(name.toLowerCase());
      
      if (info.changes === 0) {
        return Promise.resolve({ 
          success: false, 
          message: '물건을 찾을 수 없습니다.' 
        });
      }
      
      return Promise.resolve({ 
        success: true, 
        deleted: info.changes 
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 비밀번호 확인 (물건 삭제 권한 체크)
  async verifyPassword(name, password, adminPassword = null) {
    try {
      const item = await this.getItem(name);
      
      if (!item) {
        return Promise.resolve({ 
          valid: false, 
          message: '물건을 찾을 수 없습니다.' 
        });
      }

      // 비밀번호가 설정되지 않은 물건 (이전 버전)
      if (!item.password) {
        return Promise.resolve({ 
          valid: true, 
          isLegacy: true 
        });
      }

      // 관리자 비밀번호 확인 (우선)
      if (adminPassword && item.password === `ADMIN:${adminPassword}`) {
        return Promise.resolve({ 
          valid: true, 
          isAdmin: true 
        });
      }

      // 일반 비밀번호 확인
      if (item.password === password) {
        return Promise.resolve({ 
          valid: true, 
          isAdmin: false 
        });
      }

      return Promise.resolve({ 
        valid: false, 
        message: '비밀번호가 일치하지 않습니다.' 
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  // 데이터베이스 닫기
  close() {
    if (this.db) {
      try {
        this.db.close();
        console.log('✅ 데이터베이스 연결 종료');
      } catch (err) {
        console.error('데이터베이스 종료 오류:', err);
      }
    }
  }
}

module.exports = new ItemDatabase();
