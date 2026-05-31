// PM2 process config for a non-Docker VPS deploy.
// Usage:
//   npm ci && npm run build
//   npx prisma migrate deploy   (or `npx prisma db push` for first setup)
//   pm2 start ecosystem.config.js
//
// Env comes from the shell / a .env file loaded by your process manager.
module.exports = {
  apps: [
    {
      name: "germany-readiness-suite",
      script: "npm",
      args: "start", // next start
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
