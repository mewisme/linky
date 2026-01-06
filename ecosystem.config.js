export default {
  apps: [
    {
      name: "linky",
      cwd: "apps/api",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
    }
  ]
}
