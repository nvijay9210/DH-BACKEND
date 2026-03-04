// Utils/FetchEntityById.js
const { AppError } = require("../Logics/AppError");

/**
 * 🔍 Common function to fetch any entity by ID using findById
 * @param {Model} Model - Mongoose model (e.g., Tenant, Branch, User)
 * @param {string} id - The ID to fetch
 * @param {Object} options - Optional: lean, select, populate, etc.
 * @returns {Promise<Object>} - The found document
 * @throws {AppError} - 404 if not found
 */
const fetchEntityById = async (Model, id, options = {}) => {
  if (!Model || !id) {
    throw new AppError(400, "Invalid input", "Model and ID are required to fetch entity");
  }

  // Default options: lean for performance, can be overridden
  const config = {
    lean: true, // Returns plain JS object (faster, less memory)
    select: "", // e.g., "-password" to exclude fields
    populate: null, // e.g., { path: 'branch', select: 'name' }
    ...options
  };

  let query = Model.findById(id);

  // Apply optional modifiers
  if (config.select) query = query.select(config.select);
  if (config.populate) {
    if (Array.isArray(config.populate)) {
      config.populate.forEach(p => query = query.populate(p));
    } else {
      query = query.populate(config.populate);
    }
  }

  const doc = await query;

  if (!doc) {
    const modelName = Model.modelName || "Entity";
    throw new AppError(
      404,
      `${modelName.toLowerCase()} not found`,
      `The ${modelName.toLowerCase()} with id '${id}' does not exist`
    );
  }

  return doc;
};

module.exports = fetchEntityById;