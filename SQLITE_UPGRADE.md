# SQLite 데이터베이스로 업그레이드 🎉

## 주요 변경 사항

### 이전: JSON 파일
```
items.json
{
  "잼": {
    "location": "찬장",
    "image": "/uploads/123.jpg"
  }
}
```

### 현재: SQLite 데이터베이스
```
items.db (SQLite 데이터베이스 파일)
```

## 장점

### 1. 성능 향상
- ✅ 검색 속도 빠름 (인덱스 사용)
- ✅ 대량 데이터 처리 효율적
- ✅ 메모리 사용량 최적화

### 2. 안정성 증가
- ✅ 동시 읽기/쓰기 안전
- ✅ 데이터 무결성 보장
- ✅ 트랜잭션 지원

### 3. 관리 편의성
- ✅ 백업 간단 (파일 하나만 복사)
- ✅ 복원 쉬움
- ✅ 파일 크기 자동 최적화

### 4. 확장성
- ✅ 추후 사용자 관리 추가 가능
- ✅ 검색 히스토리 저장 가능
- ✅ 카테고리 기능 추가 가능

## 기존 데이터 마이그레이션

### 자동 마이그레이션
기존에 `items.json`이 있다면:

```bash
npm run migrate
```

**실행 결과:**
```
🔄 JSON 데이터를 SQLite로 마이그레이션 시작...

📦 3개의 물건을 마이그레이션합니다...

✓ 잼 → 찬장 (사진 있음)
✓ 리모컨 → 거실 테이블
✓ 열쇠 → 현관

=== 마이그레이션 결과 ===
✅ 성공: 3개

💾 기존 JSON 파일을 items.json.backup에 백업했습니다.
   문제가 없다면 나중에 삭제하세요.

✅ 마이그레이션 완료!
```

### 수동 마이그레이션
직접 확인하고 싶다면:

```bash
# 1. 기존 데이터 백업
cp items.json items.json.backup

# 2. 마이그레이션 실행
npm run migrate

# 3. 서버 시작
npm start

# 4. 웹에서 데이터 확인
# 문제없으면 items.json.backup 삭제
```

## 데이터베이스 관리

### 백업
```bash
# 데이터베이스 파일 복사
cp items.db items_backup_$(date +%Y%m%d).db
```

### 복원
```bash
# 백업 파일에서 복원
cp items_backup_20250201.db items.db
```

### 데이터 확인
SQLite CLI 도구 사용:
```bash
# SQLite 설치 (없다면)
sudo apt-get install sqlite3

# 데이터베이스 열기
sqlite3 items.db

# 데이터 조회
SELECT * FROM items;

# 종료
.exit
```

## 파일 구조

```
item-finder/
├── server.js           # 메인 서버 (SQLite 사용)
├── database.js         # 데이터베이스 관리 모듈
├── migrate.js          # JSON → SQLite 마이그레이션 스크립트
├── items.db            # SQLite 데이터베이스 (자동 생성)
├── items.json.backup   # 기존 JSON 백업 (마이그레이션 후)
└── uploads/            # 이미지 파일들
```

## 데이터베이스 스키마

```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 자동 증가 ID
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,  -- 물건 이름 (대소문자 구분 안함)
  location TEXT NOT NULL,                -- 위치
  image TEXT,                            -- 이미지 경로 (선택)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- 생성 시간
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- 수정 시간
);
```

## API 변경 사항

### 기존 API는 그대로 작동
- `GET /api/items` - 물건 목록
- `POST /api/items` - 물건 등록
- `GET /api/search?q=잼` - 물건 검색
- `DELETE /api/items/:name` - 물건 삭제

### 새로 추가된 API
- `GET /api/stats` - 통계 정보
  ```json
  {
    "total": 10,
    "withImages": 7,
    "withoutImages": 3
  }
  ```

## 문제 해결

### Q: 마이그레이션 실패?
```bash
# 1. 기존 데이터 확인
cat items.json

# 2. 데이터베이스 삭제 후 재시도
rm items.db
npm run migrate
```

### Q: 데이터가 안 보여요
```bash
# 1. 데이터베이스 파일 확인
ls -lh items.db

# 2. 데이터 확인
sqlite3 items.db "SELECT COUNT(*) FROM items;"

# 3. 서버 로그 확인
npm start
```

### Q: 예전 JSON으로 돌아가고 싶어요
```bash
# 1. 서버 중지
Ctrl+C

# 2. 데이터베이스 삭제
rm items.db

# 3. 백업 복원
cp items.json.backup items.json

# 4. 이전 버전 코드 사용
# (이전 버전 파일로 교체 필요)
```

## 성능 비교

### JSON (이전)
- 전체 파일을 메모리에 로드
- 검색 시 모든 항목 순회
- 파일 쓰기 시 전체 내용 재작성

### SQLite (현재)
- 필요한 데이터만 로드
- 인덱스로 빠른 검색
- 변경된 부분만 업데이트

**결과:** 물건이 많아질수록 SQLite가 훨씬 빠름!

## 권장 사항

1. ✅ 마이그레이션 후 며칠간 사용해보기
2. ✅ 문제없으면 `items.json.backup` 삭제
3. ✅ 정기적으로 `items.db` 백업
4. ✅ 서버 종료 시 `Ctrl+C` 사용 (깔끔한 종료)

## 추후 가능한 기능

SQLite 사용으로 다음 기능들을 쉽게 추가할 수 있습니다:

- 📊 물건 검색 히스토리
- 🏷️ 카테고리/태그 기능
- 👥 사용자별 물건 관리
- 📈 통계 및 분석
- 🔔 알림 기능
- 📝 메모 추가

필요하면 말씀해주세요!
