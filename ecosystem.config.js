// API 호스트(3.34.106.39)에서:  npm ci --omit=dev && pm2 start ecosystem.config.js && pm2 save
// .env (POSTGRES_HOST/USER/PASSWORD/DB) 는 이 폴더에 둔다 (.env.example 참고)
module.exports = {
  apps: [{
    name: "homepage-api",
    script: "index.js",
    cwd: __dirname,
    env: { NODE_ENV: "production", PORT: 3001 },
  }],
};
