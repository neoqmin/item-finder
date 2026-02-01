#!/bin/bash

echo "🔐 자체 서명 SSL 인증서 생성 중..."

# OpenSSL로 인증서 생성
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365 \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Home/OU=ItemFinder/CN=localhost"

if [ $? -eq 0 ]; then
    echo "✅ 인증서가 생성되었습니다!"
    echo "   - key.pem: 개인 키"
    echo "   - cert.pem: 인증서"
    echo ""
    echo "이제 'npm start'로 서버를 실행하면 HTTPS가 활성화됩니다."
    echo ""
    echo "⚠️  iPhone에서 접속 시:"
    echo "   1. Safari에서 https://[라즈베리파이IP]:3443 접속"
    echo "   2. '이 연결은 비공개 연결이 아닙니다' 경고 표시"
    echo "   3. '고급' 클릭 → '계속 진행' 클릭"
    echo "   4. 마이크 권한 허용"
else
    echo "❌ 인증서 생성 실패"
    exit 1
fi
