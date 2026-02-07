import http from "node:http";

const port = Number(process.env.PORT) || 7270;
const url = `http://0.0.0.0:${port}/healthz`;

const req = http.get(url, (res) => {
  res.resume();
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

req.setTimeout(4000, () => {
  req.destroy();
  process.exit(1);
});
