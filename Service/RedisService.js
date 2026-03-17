const redis = require("../config/redis");

class RedisService {
  /**
   * Create/Set data in Redis with optional expiration
   * @param {string} key - Cache key
   * @param {*} value - Data to cache (will be JSON stringified)
   * @param {number} expirationSeconds - TTL in seconds (default: 3600 = 1 hour)
   */
  static async create(key, value, expirationSeconds = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (expirationSeconds > 0) {
        await redis.set(key, serialized, "EX", expirationSeconds);
      } else {
        await redis.set(key, serialized);
      }
      console.log(`✅ Redis SET: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Read/Get data from Redis
   * @param {string} key - Cache key
   * @returns {*} Parsed data or null if not found
   */
  static async read(key) {
    try {
      const value = await redis.get(key);
      if (!value) {
        console.log(`⚠️ Redis key not found: ${key}`);
        return null;
      }
      console.log(`✅ Redis GET: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Update data in Redis
   * @param {string} key - Cache key
   * @param {*} value - New data
   * @param {number} expirationSeconds - TTL in seconds
   */
  static async update(key, value, expirationSeconds = 3600) {
    try {
      const exists = await redis.exists(key);
      if (!exists) {
        console.warn(`⚠️ Key does not exist, cannot update: ${key}`);
        return false;
      }
      const serialized = JSON.stringify(value);
      if (expirationSeconds > 0) {
        await redis.set(key, serialized, "EX", expirationSeconds);
      } else {
        await redis.set(key, serialized);
      }
      console.log(`✅ Redis UPDATE: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Redis UPDATE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete data from Redis
   * @param {string} key - Cache key
   */
  static async delete(key) {
    try {
      const result = await redis.del(key);
      console.log(`✅ Redis DELETE: ${key} (${result} key(s) deleted)`);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys by pattern
   * @param {string} pattern - Redis pattern (e.g., "user:*", "order:*")
   */
  static async readByPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        console.log(`⚠️ No keys found for pattern: ${pattern}`);
        return [];
      }

      const values = await redis.mget(...keys);
      const result = keys.map((key, index) => ({
        key,
        value: JSON.parse(values[index]),
      }));

      console.log(`✅ Redis GET PATTERN: ${pattern} (${result.length} keys)`);
      return result;
    } catch (error) {
      console.error(`❌ Redis pattern search error for ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Redis pattern (e.g., "user:*")
   */
  static async deleteByPattern(pattern) {
    try {
       if (!redis.keys) return; // Redis disabled
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        console.log(`⚠️ No keys found to delete for pattern: ${pattern}`);
        return 0;
      }

      const result = await redis.del(...keys);
      console.log(`✅ Redis DELETE PATTERN: ${pattern} (${result} key(s) deleted)`);
      return result;
    } catch (error) {
      console.error(`❌ Redis delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Clear all Redis cache (use with caution!)
   */
  static async clear() {
    try {
      await redis.flushdb();
      console.log(`✅ Redis cache cleared`);
      return true;
    } catch (error) {
      console.error(`❌ Redis FLUSHDB error:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  static async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL in seconds
   * @param {string} key - Cache key
   */
  static async getTTL(key) {
    try {
      const ttl = await redis.ttl(key);
      return ttl; // -1 if key exists without TTL, -2 if key doesn't exist
    } catch (error) {
      console.error(`❌ Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Set expiration on existing key
   * @param {string} key - Cache key
   * @param {number} expirationSeconds - TTL in seconds
   */
  static async setExpiration(key, expirationSeconds) {
    try {
      const result = await redis.expire(key, expirationSeconds);
      if (result === 1) {
        console.log(`✅ Redis EXPIRE: ${key} (${expirationSeconds}s)`);
        return true;
      }
      console.warn(`⚠️ Key not found for expiration: ${key}`);
      return false;
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }
}

module.exports = RedisService;
