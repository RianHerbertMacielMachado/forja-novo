module.exports = {
  apps: [
    {
      name: 'forja-backend',
      script: 'src/app.js',
      cwd: '/home/user/webapp/backend',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        JWT_SECRET: 'forge_secret_local_test_123',
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'admin123',
        FRONTEND_URL: 'http://localhost:5173',
        DATABASE_URL: ''
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
