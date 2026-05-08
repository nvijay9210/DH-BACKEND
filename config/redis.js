const Redis = require("ioredis");

// ======================================================
// ENV CONFIG
// ======================================================

const USE_REDIS = process.env.USE_REDIS === "true";

const REDIS_URL =
  process.env.REDIS_URL || "redis://127.0.0.1:6380";

const REDIS_KEEP_ALIVE =
  Number(process.env.REDIS_KEEP_ALIVE) || 30000;

const REDIS_CONNECT_TIMEOUT =
  Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000;

const REDIS_MAX_RETRIES =
  Number(process.env.REDIS_MAX_RETRIES) || 3;

const REDIS_RETRY_DELAY =
  Number(process.env.REDIS_RETRY_DELAY) || 50;

// ======================================================
// REDIS CLIENT
// ======================================================

let redisClient;

if (USE_REDIS) {

  redisClient = new Redis(REDIS_URL, {

    maxRetriesPerRequest: REDIS_MAX_RETRIES,

    retryStrategy: (times) => {

      const delay = Math.min(
        times * REDIS_RETRY_DELAY,
        2000
      );

      console.warn(
        `🔄 Redis retry attempt #${times}, reconnecting in ${delay}ms`
      );

      return delay;
    },

    connectTimeout: REDIS_CONNECT_TIMEOUT,

    keepAlive: REDIS_KEEP_ALIVE,

    lazyConnect: false,

    enableReadyCheck: true,

    autoResendUnfulfilledCommands: true,

    enableOfflineQueue: true,
  });

  // ======================================================
  // EVENTS
  // ======================================================

  redisClient.on("connect", () => {
    console.log("✅ Redis connected:", REDIS_URL);
  });

  redisClient.on("ready", () => {
    console.log("🚀 Redis ready");
  });

  redisClient.on("error", (err) => {
    console.error("❌ Redis error:", err.message);
  });

  redisClient.on("close", () => {
    console.warn("⚠️ Redis connection closed");
  });

  redisClient.on("reconnecting", (delay) => {
    console.log(`🔄 Redis reconnecting in ${delay}ms`);
  });

  redisClient.on("end", () => {
    console.warn("🛑 Redis connection ended");
  });

} else {

  console.log("⚠️ Redis disabled via USE_REDIS=false");

  redisClient = {
    get: async () => null,
    set: async () => null,
    setex: async () => null,
    del: async () => null,
    exists: async () => 0,
    ttl: async () => -1,
    expire: async () => null,
    incr: async () => 0,
    ping: async () => "PONG",
    quit: async () => {},
    disconnect: () => {},
    pipeline: () => ({
      incr: () => {},
      expire: () => {},
      exec: async () => [[null, 1]],
    }),
    on: () => {},
    status: "mock",
  };
}

// ======================================================
// HELPER FUNCTIONS
// ======================================================

const setEx = async (key, ttl, value) => {

  const val =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  return redisClient.setex(key, ttl, val);
};

const get = async (key) => {

  const value = await redisClient.get(key);

  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const del = async (...keys) => {

  if (!keys.length) return 0;

  return redisClient.del(...keys);
};

const exists = async (key) => {

  return (await redisClient.exists(key)) === 1;
};

const ttl = async (key) => {

  return redisClient.ttl(key);
};

const incrWithExpiry = async (key, expirySeconds) => {

  const pipeline = redisClient.pipeline();

  pipeline.incr(key);

  pipeline.expire(key, expirySeconds);

  const result = await pipeline.exec();

  return result?.[0]?.[1] || 0;
};

// ======================================================
// HEALTH CHECK
// ======================================================

const checkRedisHealth = async () => {

  try {

    const pong = await redisClient.ping();

    return {
      status: pong === "PONG" ? "healthy" : "unhealthy",
      connected: redisClient.status === "ready",
    };

  } catch (err) {

    return {
      status: "unhealthy",
      error: err.message,
      connected: false,
    };
  }
};

// ======================================================
// SHUTDOWN
// ======================================================

const gracefulShutdown = async () => {

  try {

    if (
      redisClient &&
      redisClient.status !== "end"
    ) {

      console.log("🛑 Closing Redis connection...");

      await redisClient.quit();

      console.log("✅ Redis connection closed");
    }

  } catch (err) {

    console.error(
      "❌ Redis graceful shutdown error:",
      err.message
    );
  }
};

process.on("SIGINT", gracefulShutdown);

process.on("SIGTERM", gracefulShutdown);

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  redisClient,

  setEx,
  get,
  del,
  exists,
  ttl,
  incrWithExpiry,

  checkRedisHealth,
  gracefulShutdown,
};