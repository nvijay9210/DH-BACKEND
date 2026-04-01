// config/redis.js
const Redis = require("ioredis");

// Redis configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  // Connection timeout
  connectTimeout: 10000,
  // Keep alive
  keepAlive: 30000,
  // Lazy connect (connect on first command)
  lazyConnect: false,
};

// Create Redis client
const redisClient = new Redis(redisConfig);


// Connection event handlers (using console.log since logger isn't available)
redisClient.on("connect", () => {
  console.log("✅ Redis connected:", {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
  });
});

redisClient.on("ready", () => {
  console.log("🚀 Redis is ready to accept commands");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", {
    message: err.message,
    code: err.code,
  });
});

redisClient.on("close", () => {
  console.warn("⚠️ Redis connection closed");
});

redisClient.on("reconnecting", (delay) => {
  console.log(`🔄 Redis reconnecting in ${delay}ms...`);
});

// Graceful shutdown handler
const gracefulShutdown = async () => {
  try {
    console.log("🛑 Shutting down Redis connection...");
    await redisClient.quit();
    console.log("✅ Redis connection closed gracefully");
  } catch (err) {
    console.error("❌ Error during Redis shutdown:", err);
  }
};

// Listen for termination signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Health check function
const checkRedisHealth = async () => {
  try {
    const pong = await redisClient.ping();
    return {
      status: pong === "PONG" ? "healthy" : "unhealthy",
      connected: redisClient.status === "ready",
    };
  } catch (err) {
    console.error("Redis health check failed:", err);
    return { status: "unhealthy", error: err.message, connected: false };
  }
};

// Helper functions for common operations
const redisHelpers = {
  /**
   * Set a key with expiration (TTL in seconds)
   */
  setEx: async (key, ttlSeconds, value) => {
    try {
      const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      return await redisClient.setex(key, ttlSeconds, stringValue);
    } catch (err) {
      console.error("Redis setEx error:", err);
      throw err;
    }
  },

  /**
   * Get and parse value (handles JSON)
   */
  get: async (key) => {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value; // Return as string if not JSON
      }
    } catch (err) {
      console.error("Redis get error:", err);
      throw err;
    }
  },

  /**
   * Increment counter with expiration
   */
  incrWithExpiry: async (key, ttlSeconds) => {
    try {
      const pipeline = redisClient.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();
      return results?.[0]?.[1] || 0;
    } catch (err) {
      console.error("Redis incrWithExpiry error:", err);
      throw err;
    }
  },

  /**
   * Delete multiple keys
   */
  del: async (...keys) => {
    try {
      if (!keys || keys.length === 0) return 0;
      return await redisClient.del(...keys);
    } catch (err) {
      console.error("Redis del error:", err);
      throw err;
    }
  },

  /**
   * Check if key exists
   */
  exists: async (key) => {
    try {
      return (await redisClient.exists(key)) === 1;
    } catch (err) {
      console.error("Redis exists error:", err);
      throw err;
    }
  },

  /**
   * Get TTL of a key (in seconds)
   */
  ttl: async (key) => {
    try {
      return await redisClient.ttl(key);
    } catch (err) {
      console.error("Redis ttl error:", err);
      throw err;
    }
  },
};

// Export client and helpers
// config/redis.js - at the end
module.exports = {
  redisClient, // raw client
  checkRedisHealth,
  gracefulShutdown,
  // Spread helpers for direct use
  setEx: redisHelpers.setEx,
  get: redisHelpers.get,
  del: redisHelpers.del,
  exists: redisHelpers.exists,
  ttl: redisHelpers.ttl,
  incrWithExpiry: redisHelpers.incrWithExpiry,
};