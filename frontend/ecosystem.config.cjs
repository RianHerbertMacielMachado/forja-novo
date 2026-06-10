module.exports = {
  apps: [
    {
      name: 'forja-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      cwd: '/home/user/webapp/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
