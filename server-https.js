const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const multer = require('multer');

const app = express();
const HTTP_PORT = 3001;
const HTTPS_PORT = 3443;
const DATA_FILE = path.join(__dirname, 'items.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 업로드 디렉토리 생성
async function initUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR);
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

// 데이터 파일 초기화
async function initDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({}));
  }
}

// 물건 목록 조회
app.get('/api/items', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
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

    const data = await fs.readFile(DATA_FILE, 'utf8');
    const items = JSON.parse(data);
    
    // 기존 아이템이 있으면 이전 이미지 삭제
    if (items[name.toLowerCase()] && items[name.toLowerCase()].image) {
      try {
        await fs.unlink(path.join(__dirname, items[name.toLowerCase()].image));
      } catch (err) {
        console.error('이전 이미지 삭제 실패:', err);
      }
    }
    
    items[name.toLowerCase()] = {
      location,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2));
    console.log('✅ 등록 완료:', name.toLowerCase());
    res.json({ success: true, name, location, image: items[name.toLowerCase()].image });
  } catch (error) {
    console.error('저장 오류:', error);
    res.status(500).json({ error: '데이터를 저장할 수 없습니다.' });
  }
});

// 물건 찾기
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase();
    
    console.log('=== 검색 요청 ===');
    console.log('원본 검색어:', req.query.q);
    console.log('소문자 변환:', query);
    
    if (!query) {
      console.log('검색어 없음');
      return res.status(400).json({ error: '검색어를 입력해주세요.' });
    }

    const data = await fs.readFile(DATA_FILE, 'utf8');
    const items = JSON.parse(data);
    
    console.log('등록된 물건 목록:', Object.keys(items));
    
    // 정확한 매치 먼저 찾기
    if (items[query]) {
      const item = items[query];
      console.log('✅ 정확히 일치:', query);
      return res.json({ 
        found: true, 
        location: typeof item === 'string' ? item : item.location,
        image: typeof item === 'object' ? item.image : null,
        name: query 
      });
    }
    
    // 부분 매치 찾기
    const matches = Object.keys(items).filter(key => 
      key.includes(query) || query.includes(key)
    );
    
    console.log('부분 일치 검색 결과:', matches);
    
    if (matches.length > 0) {
      const firstMatch = matches[0];
      const item = items[firstMatch];
      console.log('✅ 부분 일치:', firstMatch);
      return res.json({ 
        found: true, 
        location: typeof item === 'string' ? item : item.location,
        image: typeof item === 'object' ? item.image : null,
        name: firstMatch 
      });
    }
    
    console.log('❌ 검색 결과 없음');
    res.json({ found: false });
  } catch (error) {
    console.error('검색 오류:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

// 물건 삭제
app.delete('/api/items/:name', async (req, res) => {
  try {
    const name = req.params.name.toLowerCase();
    
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const items = JSON.parse(data);
    
    if (items[name]) {
      // 이미지 파일도 삭제
      if (typeof items[name] === 'object' && items[name].image) {
        try {
          await fs.unlink(path.join(__dirname, items[name].image));
        } catch (err) {
          console.error('이미지 삭제 실패:', err);
        }
      }
      
      delete items[name];
      await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '물건을 찾을 수 없습니다.' });
    }
  } catch (error) {
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

// 서버 시작
Promise.all([initDataFile(), initUploadDir()]).then(() => {
  // HTTP 서버
  http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`HTTP 서버: http://[라즈베리파이IP]:${HTTP_PORT}`);
  });

  // HTTPS 서버 (인증서가 있는 경우)
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath = path.join(__dirname, 'key.pem');
  
  if (fsSync.existsSync(certPath) && fsSync.existsSync(keyPath)) {
    const httpsOptions = {
      key: fsSync.readFileSync(keyPath),
      cert: fsSync.readFileSync(certPath)
    };
    
    https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`HTTPS 서버: https://[라즈베리파이IP]:${HTTPS_PORT}`);
      console.log('⚠️  자체 서명 인증서 경고가 나타나면 "고급" → "계속 진행"을 선택하세요');
    });
  } else {
    console.log('\n📝 HTTPS 인증서를 생성하려면 다음 명령을 실행하세요:');
    console.log('   npm run generate-cert');
  }
});
