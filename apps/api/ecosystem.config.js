module.exports = {
  apps: [
    {
      name: "linky",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
    }
  ]
}
