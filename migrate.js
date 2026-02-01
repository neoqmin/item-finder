#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const db = require('./database');

async function migrate() {
  try {
    console.log('🔄 JSON 데이터를 SQLite로 마이그레이션 시작...\n');

    // 데이터베이스 초기화
    await db.init();

    const jsonPath = path.join(__dirname, 'items.json');

    // JSON 파일 확인
    try {
      await fs.access(jsonPath);
    } catch {
      console.log('⚠️  items.json 파일이 없습니다. 빈 데이터베이스로 시작합니다.');
      console.log('✅ 마이그레이션 완료!\n');
      db.close();
      return;
    }

    // JSON 데이터 읽기
    const jsonData = await fs.readFile(jsonPath, 'utf8');
    const items = JSON.parse(jsonData);

    const itemNames = Object.keys(items);

    if (itemNames.length === 0) {
      console.log('⚠️  items.json이 비어있습니다.');
      console.log('✅ 마이그레이션 완료!\n');
      db.close();
      return;
    }

    console.log(`📦 ${itemNames.length}개의 물건을 마이그레이션합니다...\n`);

    let successCount = 0;
    let errorCount = 0;

    // 각 아이템을 DB에 저장
    for (const name of itemNames) {
      const item = items[name];
      
      try {
        let location, image;

        // 구 형식(문자열) vs 신 형식(객체) 구분
        if (typeof item === 'string') {
          location = item;
          image = null;
        } else {
          location = item.location;
          image = item.image || null;
        }

        await db.upsertItem(name, location, image);
        console.log(`✓ ${name} → ${location}${image ? ' (사진 있음)' : ''}`);
        successCount++;
      } catch (error) {
        console.error(`✗ ${name} 마이그레이션 실패:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== 마이그레이션 결과 ===');
    console.log(`✅ 성공: ${successCount}개`);
    if (errorCount > 0) {
      console.log(`❌ 실패: ${errorCount}개`);
    }

    // JSON 파일 백업
    const backupPath = path.join(__dirname, 'items.json.backup');
    await fs.copyFile(jsonPath, backupPath);
    console.log(`\n💾 기존 JSON 파일을 ${backupPath}에 백업했습니다.`);
    console.log('   문제가 없다면 나중에 삭제하세요.\n');

    console.log('✅ 마이그레이션 완료!\n');
    db.close();

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    db.close();
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  migrate();
}

module.exports = migrate;
