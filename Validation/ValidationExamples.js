/**
 * USAGE EXAMPLES FOR JOI VALIDATION SCHEMAS
 *
 * This file demonstrates how to use the Joi validation schemas
 * and middleware in your controllers.
 */

// ============================================================================
// EXAMPLE 1: Using Validation Middleware in Routes
// ============================================================================

/*
const express = require('express');
const router = express.Router();
const { validateRequest } = require('../Middleware/ValidationMiddleware');
const userController = require('../Controller/UserController');

// Example route with validation middleware
router.post('/users',
  validateRequest('createUser'), // Validates req.body against createUser schema
  userController.createUser
);

router.put('/users/:id',
  validateRequest('updateUser'), // Validates req.body against updateUser schema
  userController.updateUser
);

router.post('/login',
  validateRequest('login'), // Validates req.body against login schema
  userController.login
);

// Example with parameter validation
router.get('/users/:userId',
  validateRequest('userAccess', 'params'), // Validates req.params against userAccess schema
  userController.getUserById
);
*/

// ============================================================================
// EXAMPLE 2: Using Validation in Controllers (Direct Validation)
// ============================================================================

/*
const { validateData } = require('../Middleware/ValidationMiddleware');
const { AppError } = require('../Logics/AppError');

class ExampleController {
  async createProject(req, res, next) {
    try {
      // Validate the request data
      const validation = validateData('createProject', req.body);

      if (!validation.isValid) {
        // Return validation errors
        return next(new AppError('Validation failed', 400, validation.errors));
      }

      // Use the validated/cleaned data
      const projectData = validation.value;

      // Proceed with business logic...
      // const result = await ProjectService.createProject(projectData);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: projectData
      });

    } catch (error) {
      next(error);
    }
  }

  async updateOrder(req, res, next) {
    try {
      // Validate both body and params
      const bodyValidation = validateData('updateOrder', req.body);
      const paramsValidation = validateData('orderAccess', req.params);

      if (!bodyValidation.isValid) {
        return next(new AppError('Body validation failed', 400, bodyValidation.errors));
      }

      if (!paramsValidation.isValid) {
        return next(new AppError('Params validation failed', 400, paramsValidation.errors));
      }

      // Use validated data
      const orderData = bodyValidation.value;
      const orderParams = paramsValidation.value;

      // Proceed with business logic...

    } catch (error) {
      next(error);
    }
  }
}
*/

// ============================================================================
// EXAMPLE 3: Available Validation Schemas by Module
// ============================================================================

/*
USER MODULE:
- login: For user authentication
- createUser: For creating new users
- updateUser: For updating existing users
- userAccess: For user access control

TENANT MODULE:
- createTenant: For creating new tenants
- updateTenant: For updating tenant information

BRANCH MODULE:
- createBranch: For creating new branches
- updateBranch: For updating branch information

PROJECT MODULE:
- createProject: For creating new projects (includes date validation)
- updateProject: For updating project information

ORDER MODULE:
- createOrder: For creating new material orders
- updateOrder: For updating order information

MATERIAL MODULE:
- materialList: For material listing queries
- materialUsed: For recording material usage
- editMaterialUsed: For updating material usage
- measurementDetails: For measurement recordings
- updateMaterial: For updating material information
- materialDelete: For material deletion

LABOUR MODULE:
- labourDetails: For recording labour work
- updateLabour: For updating labour records
- labourDelete: For labour record deletion
- labourPayment: For labour payment recording
- labourPaymentUpdate: For updating labour payments

PAYMENT MODULE:
- newPayment: For recording new payments
- updatePaymentDetails: For updating payment information
- materialPaymentsUpdate: For bulk material payment updates
- materialPayment: For material-specific payments

MASTER DATA MODULE:
- labourList: For labour master data queries
- materialList: For material master data queries
- contractorList: For contractor master data queries
- supplierList: For supplier master data queries
- labourTypeDelete: For labour type deletion

USER BRANCH MODULE:
- createUserBranch: For assigning users to branches
- updateUserBranch: For updating user-branch assignments
- getUserBranches: For querying user-branch relationships
- deleteUserBranch: For removing user-branch assignments
*/

// ============================================================================
// EXAMPLE 4: Custom Validation in Service Layer
// ============================================================================

/*
const { validateData } = require('../Middleware/ValidationMiddleware');

class ExampleService {
  async createOrder(orderData) {
    // Pre-validate data before processing
    const validation = validateData('createOrder', orderData);

    if (!validation.isValid) {
      throw new Error('Invalid order data: ' + validation.errors.map(e => e.message).join(', '));
    }

    // Use validated data for database operations
    const cleanData = validation.value;

    // Proceed with database operations...
    // return await this.orderRepository.create(cleanData);
  }

  async validateAndProcessBulkData(items) {
    const validItems = [];
    const errors = [];

    items.forEach((item, index) => {
      const validation = validateData('materialUsed', item);
      if (validation.isValid) {
        validItems.push(validation.value);
      } else {
        errors.push({
          index,
          errors: validation.errors
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Validation failed for ${errors.length} items`);
    }

    // Process valid items...
    return validItems;
  }
}
*/

// ============================================================================
// EXAMPLE 5: Integration with Existing Controllers
// ============================================================================

/*
// In your existing controller files, you can add validation like this:

const { validateRequest } = require('../Middleware/ValidationMiddleware');

class UserController {
  // Existing method with added validation
  async createUser(req, res, next) {
    try {
      // Validation is now handled by middleware in the route
      // But you can still validate manually if needed
      const result = await UserService.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Or validate within the controller method
  async updateUser(req, res, next) {
    try {
      const { validateData } = require('../Middleware/ValidationMiddleware');
      const validation = validateData('updateUser', req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const result = await UserService.updateUser(req.params.id, validation.value);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

// In your route files, add the middleware:

const userRoutes = require('express').Router();
const userController = require('../Controller/UserController');
const { validateRequest } = require('../Middleware/ValidationMiddleware');

// Routes with validation
userRoutes.post('/users', validateRequest('createUser'), userController.createUser);
userRoutes.put('/users/:id', validateRequest('updateUser'), userController.updateUser);
userRoutes.post('/login', validateRequest('login'), userController.login);

module.exports = userRoutes;
*/

module.exports = {
  // This file is for documentation only
  // Remove this export when implementing in your codebase
};