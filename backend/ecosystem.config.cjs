module.exports = {
  apps: [
    {
      name: 'crm-backend',
      script: 'dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,

      },
    },
  ],
};
