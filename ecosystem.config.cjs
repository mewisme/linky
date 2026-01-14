module.exports = {
  apps: [
    {
      name: "linky",
      cwd: "apps/api",
      watch: true,
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
    }
  ]
}
