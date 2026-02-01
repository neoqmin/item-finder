const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const multer = require('multer');
const db = require('./database');

const app = express();
const HTTP_PORT = 3001;
const HTTPS_PORT = 3443;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 업로드 디렉토리 생성
async function initUploadDir() {
  try {
    await fsPromises.access(UPLOAD_DIR);
  } catch {
    await fsPromises.mkdir(UPLOAD_DIR);
  }
}

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 물건 목록 조회
app.get('/api/items', async (req, res) => {
  try {
    const items = await db.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('목록 조회 오류:', error);
    res.status(500).json({ error: '데이터를 읽을 수 없습니다.' });
  }
});

// 물건 등록/수정 (이미지 포함)
app.post('/api/items', upload.single('image'), async (req, res) => {
  try {
    const { name, location } = req.body;
    
    console.log('=== 물건 등록 요청 ===');
    console.log('이름:', name);
    console.log('위치:', location);
    console.log('이미지:', req.file ? req.file.filename : '없음');
    
    if (!name || !location) {
      return res.status(400).json({ error: '물건 이름과 위치를 모두 입력해주세요.' });
    }

    // 기존 아이템 확인 (이전 이미지 삭제용)
    const existing = await db.getItem(name);
    if (existing && existing.image) {
      try {
        await fsPromises.unlink(path.join(__dirname, existing.image));
        console.log('이전 이미지 삭제:', existing.image);
      } catch (err) {
        console.error('이전 이미지 삭제 실패:', err);
      }
    }
    
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (existing ? existing.image : null);
    const result = await db.upsertItem(name, location, imagePath);
    
    console.log('✅ 등록 완료:', result);
    res.json({ 
      success: true, 
      name: result.name, 
      location, 
      image: imagePath 
    });
  } catch (error) {
    console.error('저장 오류:', error);
    res.status(500).json({ error: '데이터를 저장할 수 없습니다.' });
  }
});

// 물건 찾기
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    console.log('=== 검색 요청 ===');
    console.log('검색어:', query);
    
    if (!query) {
      console.log('검색어 없음');
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    const result = await db.searchItem(query);
    
    if (result.found) {
      console.log('✅ 검색 성공:', result.name);
    } else {
      console.log('❌ 검색 결과 없음');
    }
    
    res.json(result);
  } catch (error) {
    console.error('검색 오류:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

// 물건 삭제
app.delete('/api/items/:name', async (req, res) => {
  try {
    const name = req.params.name;
    
    console.log('=== 삭제 요청 ===');
    console.log('물건 이름:', name);
    
    // 이미지 정보 먼저 가져오기
    const item = await db.getItem(name);
    
    if (!item) {
      return res.status(404).json({ error: '물건을 찾을 수 없습니다.' });
    }
    
    // 이미지 파일 삭제
    if (item.image) {
      try {
        await fsPromises.unlink(path.join(__dirname, item.image));
        console.log('이미지 삭제:', item.image);
      } catch (err) {
        console.error('이미지 삭제 실패:', err);
      }
    }
    
    // DB에서 삭제
    const result = await db.deleteItem(name);
    
    if (result.success) {
      console.log('✅ 삭제 완료:', name);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: result.message });
    }
  } catch (error) {
    console.error('삭제 오류:', error);
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

// 데이터베이스 통계 (추가 기능)
app.get('/api/stats', async (req, res) => {
  try {
    const items = await db.getAllItems();
    const total = Object.keys(items).length;
    const withImages = Object.values(items).filter(item => item.image).length;
    
    res.json({
      total,
      withImages,
      withoutImages: total - withImages
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계를 가져올 수 없습니다.' });
  }
});

// 서버 시작
async function startServer() {
  try {
    // 데이터베이스 초기화
    await db.init();
    
    // 업로드 디렉토리 초기화
    await initUploadDir();
    
    // HTTP 서버
    http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`HTTP 서버: http://[라즈베리파이IP]:${HTTP_PORT}`);
    });

    // HTTPS 서버 (인증서가 있는 경우)
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      
      https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS 서버: https://[라즈베리파이IP]:${HTTPS_PORT}`);
        console.log('⚠️  자체 서명 인증서 경고가 나타나면 "고급" → "계속 진행"을 선택하세요');
      });
    } else {
      console.log('\n📝 HTTPS 인증서를 생성하려면 다음 명령을 실행하세요:');
      console.log('   npm run generate-cert');
    }
    
    console.log('\n✅ 서버가 SQLite 데이터베이스와 함께 시작되었습니다!');
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

// 종료 시 데이터베이스 정리
process.on('SIGINT', () => {
  console.log('\n서버 종료 중...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n서버 종료 중...');
  db.close();
  process.exit(0);
});

startServer();
