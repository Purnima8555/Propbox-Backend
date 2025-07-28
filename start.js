// start.js
require("dotenv").config({ path: "./config/config.env" }); // 👈 load from correct path
const fs = require("fs");
const https = require("https");
const app = require("./app"); // This will call connectDB() from db.js

const sslOptions = {
  key: fs.readFileSync("./cert/server.key"),
  cert: fs.readFileSync("./cert/server.crt"),
};

const port = process.env.PORT || 443;
https.createServer(sslOptions, app).listen(port, () => {
  console.log(`🔒 HTTPS Server running at https://localhost:${port}`);
});
