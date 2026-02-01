# 물건 찾기 앱 🔍

음성으로 물건의 위치를 찾을 수 있는 웹 앱입니다.
**SQLite 데이터베이스** 사용으로 안정성과 성능이 향상되었습니다!

## 설치 방법

1. 라즈베리파이에서 이 폴더로 이동:
```bash
cd /path/to/item-finder
```

2. 의존성 설치:
```bash
npm install
```

3. (선택) 기존 JSON 데이터가 있다면 마이그레이션:
```bash
npm run migrate
```

4. HTTPS 인증서 생성 (음성 인식용):
```bash
npm run generate-cert
```

5. 서버 실행:
```bash
npm start
```

## 사용 방법

### 1. 접속하기
- iPhone Safari에서 `http://[라즈베리파이IP]:3001` 접속
- 예: `http://192.168.1.100:3001`

### 2. 물건 등록하기
- 물건 이름: 잼
- 위치: 찬장
- 사진: 카메라로 촬영하거나 갤러리에서 선택 (선택사항)
- "등록하기" 버튼 클릭

### 3. 음성으로 찾기
- "음성 검색 시작" 버튼 클릭
- "잼 어디있어?" 라고 말하기
- "찬장에 있습니다" 음성 응답

## 지원하는 질문 형식
- "잼 어디있어?"
- "리모컨 어디야?"
- "열쇠 찾아줘"
- "우유 어디에 있어?"

## 참고사항
- iPhone Safari에서 음성 인식이 가장 잘 작동합니다
- Chrome 브라우저도 지원합니다
- 처음 음성 검색 시 마이크 권한을 허용해주세요

## 자동 실행 설정 (선택사항)

라즈베리파이 부팅 시 자동으로 실행하려면:

1. PM2 설치:
```bash
npm install -g pm2
```

2. 앱 실행:
```bash
pm2 start server-https.js --name item-finder
```

3. 부팅 시 자동 실행 설정:
```bash
pm2 startup
pm2 save
```

## 포트 변경

기본 포트는 3001입니다. 변경하려면 `server.js` 파일의 `PORT` 값을 수정하세요.

## 데이터베이스

### SQLite 사용
- 모든 데이터는 `items.db` 파일에 저장됩니다
- JSON보다 안정적이고 빠릅니다
- 동시 접근 안전
- 백업이 쉽습니다 (파일 하나만 복사)

### 백업 방법
```bash
# 데이터베이스 백업
cp items.db items.db.backup

# 복원
cp items.db.backup items.db
```

### 기존 JSON 데이터 마이그레이션
기존에 `items.json` 파일이 있다면:
```bash
npm run migrate
```
자동으로 모든 데이터가 SQLite로 이전되고, JSON 파일은 `.backup`으로 백업됩니다.

### 데이터베이스 구조
```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  image TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```
