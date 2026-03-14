const { AppError } = require('../Logics/AppError');
const validationSchemas = require('../Validation/JoiValidation');

/**
 * Middleware to validate request data using Joi schemas
 * @param {string} schemaName - The name of the validation schema to use (e.g., 'createUser', 'updateUser')
 * @param {string} property - The property of req object to validate (body, params, query)
 * @returns {Function} Express middleware function
 */
const validateRequest = (schemaName, property = 'body') => {
  return (req, res, next) => {
    console.log(req.body)
    try {
      // Get the validation schema from the validation object
      const validationGroup = Object.keys(validationSchemas).find(key =>
        typeof validationSchemas[key] === 'object' && validationSchemas[key][schemaName]
      );

      if (!validationGroup) {
        return next(new AppError(`Validation schema '${schemaName}' not found`, 500));
      }

      const schema = validationSchemas[validationGroup][schemaName];
      if (!schema) {
        return next(new AppError(`Validation schema '${schemaName}' not found in ${validationGroup}`, 500));
      }

      // Get the data to validate based on property
      const dataToValidate = req[property];

      // Validate the data
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false, // Return all errors, not just the first one
        stripUnknown: true, // Remove unknown properties
        convert: true // Convert types where possible
      });

      if (error) {
        // Format validation errors
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context.value
        }));

        return next(new AppError('Validation failed', 400, errorMessages));
      }

      // Replace the request data with validated/cleaned data
      req[property] = value;
      next();
    } catch (err) {
      next(new AppError('Validation middleware error', 500));
    }
  };
};

/**
 * Middleware to validate multiple properties at once
 * @param {Array} validations - Array of {schemaName, property} objects
 * @returns {Function} Express middleware function
 */
const validateMultiple = (validations) => {
  return (req, res, next) => {
    try {
      const errors = [];

      validations.forEach(({ schemaName, property = 'body' }) => {
        const schema = validationSchemas[schemaName];
        if (!schema) {
          errors.push({ field: 'validation', message: `Schema '${schemaName}' not found` });
          return;
        }

        const dataToValidate = req[property];
        const { error, value } = schema.validate(dataToValidate, {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          error.details.forEach(detail => {
            errors.push({
              field: `${property}.${detail.path.join('.')}`,
              message: detail.message,
              value: detail.context.value
            });
          });
        } else {
          req[property] = value;
        }
      });

      if (errors.length > 0) {
        return next(new AppError('Validation failed', 400, errors));
      }

      next();
    } catch (err) {
      next(new AppError('Validation middleware error', 500));
    }
  };
};

/**
 * Helper function to validate data directly (not as middleware)
 * @param {string} schemaName - The name of the validation schema (e.g., 'createUser', 'updateUser')
 * @param {Object} data - The data to validate
 * @returns {Object} - {isValid: boolean, value: Object, errors: Array}
 */
const validateData = (schemaName, data) => {
  try {
    // Find the validation group that contains the schema
    const validationGroup = Object.keys(validationSchemas).find(key =>
      typeof validationSchemas[key] === 'object' && validationSchemas[key][schemaName]
    );

    if (!validationGroup) {
      return {
        isValid: false,
        value: null,
        errors: [{ message: `Validation schema '${schemaName}' not found` }]
      };
    }

    const schema = validationSchemas[validationGroup][schemaName];
    if (!schema) {
      return {
        isValid: false,
        value: null,
        errors: [{ message: `Validation schema '${schemaName}' not found in ${validationGroup}` }]
      };
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return { isValid: false, value: null, errors };
    }

    return { isValid: true, value, errors: [] };
  } catch (err) {
    return {
      isValid: false,
      value: null,
      errors: [{ message: 'Validation error occurred' }]
    };
  }
};

module.exports = {
  validateRequest,
  validateMultiple,
  validateData
};