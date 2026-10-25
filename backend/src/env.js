import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Loaded as the very first import of server.js so process.env is populated
// before any other module (passport config, controllers) reads it at import time.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

// Fail fast on missing required config instead of discovering it mid-request
// (e.g. a user row created, then signToken() throwing on the response).
const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")} (check backend/src/.env)`);
  process.exit(1);
}
