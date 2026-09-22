# homepage_backend

관세법인 에이원 홈페이지 게시판 읽기 API. PostgreSQL(articles, article_attachments) → JSON. 프론트는 ../homepage (CRA, CloudFront).

- `GET /api/articles?category=aonenews|customsnews|ceocolumn` 목록 (no 내림차순, 본문 제외)
- `GET /api/articles/:category/:no` 본문 + 첨부 `[{filename, url}]`
- 공개 읽기 전용: `is_published` 이고 `deleted_at` 이 null 인 글만. CORS 전체 허용, `Cache-Control: max-age=60`

## 실행

```
cp .env.example .env   # POSTGRES_* 채우기
npm install
npm start              # http://localhost:3001   (개발: npm run dev = 파일 변경 시 재시작)
```

## 운영 (3.34.106.39, pm2)

```
npm ci --omit=dev
pm2 start ecosystem.config.js && pm2 save && pm2 startup
curl "http://127.0.0.1:3001/api/articles?category=ceocolumn"
```

- Node 20.12 이상. 보안그룹 인바운드 3001 필요.
- DB 서버(43.202.250.112)의 5432 에 이 서버 IP 허용 필요.
- 프론트가 https://www.aonecustoms.com 이라 브라우저는 http API 를 직접 못 부름 → CloudFront `/api/*` 동작(도메인 필요) 또는 API 앞 HTTPS 도메인.
