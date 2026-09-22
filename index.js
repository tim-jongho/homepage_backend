/* 홈페이지 게시판 읽기 API — DB(articles, article_attachments) 를 사이트에 노출. 공개 읽기 전용: is_published 이고 삭제되지 않은 글만.
   실행: npm install && npm start   (PORT 기본 3001, Node >= 20.12). 개발 중 자동 재시작은 npm run dev
   운영: pm2 start ecosystem.config.js → nginx 가 https://api.aonecustoms.com/homepage-api/ 를 127.0.0.1:3001 로 프록시. 설정은 이 폴더의 .env
   GET /articles?category=customsnews   목록 (no 내림차순, 본문 제외)
   GET /articles/:category/:no          본문 + 첨부 [{filename, url}]
   운영 URL 은 https://api.aonecustoms.com/homepage-api/articles?... (/homepage-api 접두어가 붙어 와도 처리)
*/
const path = require("path");
const express = require("express");
const { Pool } = require("pg");

try { process.loadEnvFile(path.join(__dirname, ".env")); } catch { /* .env 없으면 환경변수 그대로 사용 */ }
const pool = new Pool({ host: process.env.POSTGRES_HOST, port: process.env.POSTGRES_PORT || 5432, user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD, database: process.env.POSTGRES_DB || "homepage", max: 5 });
const CATEGORIES = ["aonenews", "customsnews", "ceocolumn"];
const CDN = "https://aonecustoms-cdn.s3.ap-northeast-2.amazonaws.com/";
const LIVE = "is_published and deleted_at is null";
const app = express();
const api = express.Router();

app.use((req, res, next) => {
  res.set({ "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" });
  next();
});

api.get("/articles", async (req, res) => {
  const { category } = req.query;
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "category: " + CATEGORIES.join(" | ") });
  const { rows } = await pool.query(
    `select no, title, subtitle, date::text, author, article_type from articles where category = $1 and ${LIVE} order by no desc`, [category]);
  res.json(rows);
});

api.get("/articles/:category/:no", async (req, res) => {
  const { category } = req.params, no = Number(req.params.no);
  if (!CATEGORIES.includes(category) || !Number.isInteger(no)) return res.status(404).json({ error: "not found" });
  const { rows: [a] } = await pool.query(
    `select id, no, title, subtitle, date::text, content, author, article_type from articles where category = $1 and no = $2 and ${LIVE}`, [category, no]);
  if (!a) return res.status(404).json({ error: "not found" });
  const { rows: att } = await pool.query(
    "select original_filename as filename, s3_key from article_attachments where article_id = $1 and deleted_at is null order by sort_order, original_filename", [a.id]);
  const { id, ...article } = a;
  // s3_key 바이트(NFC/NFD 섞임) 그대로 세그먼트별 인코딩 → 기존 S3 객체 키와 일치
  res.json({ ...article, attached: att.map(x => ({ filename: x.filename, url: CDN + x.s3_key.split("/").map(encodeURIComponent).join("/") })) });
});

// nginx 가 /homepage-api/ 접두어를 떼고 넘기면(proxy_pass ...:3001/) 두 번째, 그대로 넘기면 첫 번째 마운트가 받음
app.use("/homepage-api", api);
app.use("/", api);
app.use((req, res) => res.status(404).json({ error: "not found" }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "server error" }); });  // eslint-disable-line no-unused-vars
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`api on :${port}`));
