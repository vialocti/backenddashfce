module.exports = {
  apps: [
    {
      name: 'backenddash',
      // codigo compilado: correr `npm run build` antes de iniciar o recargar
      script: './dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
      },
      time: true,
    },
  ],
}
