require("dotenv").config();
const Redis = require("ioredis");

const USE_REDIS = process.env.USE_REDIS || "true";

let redis;

if (USE_REDIS === "true") {
  redis = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000); // max 2s
      console.warn(`Redis retry attempt #${times}, reconnecting in ${delay}ms`);
      return delay;
    },
  });

  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => console.error("❌ Redis error", err));
} else {
  // 🚧 Mock Redis client when disabled (for dev/testing only)
  console.log("⚠️ Redis disabled via USE_REDIS=false");
  redis = {
    get: async () => null,
    set: async () => null,
    del: async () => null,
    expire: async () => null,
    quit: async () => {},
    on: () => {}, // no-op for event listeners
  };
}

module.exports = redis;
