const Joi = require("joi");

/* ============================================================================
   JOY VALIDATION SCHEMAS FOR ALL MODULES
   Based on DDL schema and Service file patterns
   ============================================================================ */

// ============================================================================
// COMMON VALIDATION HELPERS
// ============================================================================

const commonFields = {
  tenant_id: Joi.number().integer().positive().required(),
  branch_id: Joi.number().integer().positive().required(),
  created_by: Joi.string().max(100).optional(),
  updated_by: Joi.string().max(100).optional(),
};

const dateValidation = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    "string.pattern.base": "Date must be in YYYY-MM-DD format",
  });

const phoneValidation = Joi.string()
  .pattern(/^[0-9+\-\s()]{10,20}$/)
  .messages({
    "string.pattern.base":
      "Phone number must be 10-20 characters with valid format",
  });

const emailValidation = Joi.string().email().max(255).messages({
  "string.email": "Must be a valid email address",
});

// ============================================================================
// USER MODULE VALIDATIONS
// ============================================================================

const userValidation = {
  // Login validation
  login: Joi.object({
    username: Joi.string().min(1).max(30).required().messages({
      "string.empty": "Username is required",
      "string.max": "Username cannot exceed 30 characters",
    }),
    password: Joi.string().min(1).required().messages({
      "string.empty": "Password is required",
    }),
    host: Joi.string().min(1).required().messages({
      "string.empty": "Host is required",
    }),
  }),

  // Create user validation
  createUser: Joi.object({
    User_name: Joi.string().min(1).max(30).required().messages({
      "string.empty": "Username is required",
      "string.max": "Username cannot exceed 30 characters",
    }),
    Password: Joi.string().min(6).max(255).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.max": "Password cannot exceed 255 characters",
    }),
    Rights: Joi.string()
      .valid("Super User", "Admin", "User", "Manager")
      .required()
      .messages({
        "any.only": "Rights must be one of: Super User, Admin, User, Manager",
      }),
    Status: Joi.string().valid("Active", "Inactive").default("Active"),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id,
    Created_by: Joi.string().max(30).optional(),
  }),

  // Update user validation
  updateUser: Joi.object({
    User_name: Joi.string().min(1).max(30).optional(),
    Rights: Joi.string()
      .valid("Super User", "Admin", "User", "Manager")
      .optional(),
    Status: Joi.string().valid("Active", "Inactive").optional(),
    Updated_by: Joi.string().max(30).optional(),
  })
    .min(1)
    .messages({
      "object.min": "At least one field must be provided for update",
    }),

  // User access validation
  userAccess: Joi.object({
    user_id: Joi.number().integer().positive().optional(),
    branch_id: Joi.number().integer().positive().optional(),
    role: Joi.string()
      .valid("Super User", "Admin", "User", "Manager")
      .optional(),
  }).min(1),
};

// ============================================================================
// TENANT MODULE VALIDATIONS
// ============================================================================

const tenantValidation = {
  createTenant: Joi.object({
    tenant_name: Joi.string().min(1).max(100).required().messages({
      "string.empty": "Tenant name is required",
      "string.max": "Tenant name cannot exceed 100 characters",
    }),
    tenant_domain: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Tenant domain is required",
      "string.max": "Tenant domain cannot exceed 255 characters",
    }),
    tenant_app_name: Joi.string().max(150).optional(),
    tenant_app_logo: Joi.string().max(255).optional(),
    tenant_app_font: Joi.string().max(50).optional(),
    tenant_app_themes: Joi.string().optional(), // JSON string
    is_active: Joi.boolean().default(true),
    created_by: Joi.string().max(50).default("SYSTEM"),
  }),

  updateTenant: Joi.object({
    tenant_name: Joi.string().min(1).max(100).optional(),
    tenant_domain: Joi.string().min(1).max(255).optional(),
    tenant_app_name: Joi.string().max(150).optional(),
    tenant_app_logo: Joi.string().max(255).optional(),
    tenant_app_font: Joi.string().max(50).optional(),
    tenant_app_themes: Joi.string().optional(),
    is_active: Joi.boolean().optional(),
    updated_by: Joi.string().max(50).optional(),
  }).min(1),
};

// ============================================================================
// BRANCH MODULE VALIDATIONS
// ============================================================================

const branchValidation = {
  createBranch: Joi.object({
    branch_name: Joi.string().min(1).max(150).required().messages({
      "string.empty": "Branch name is required",
      "string.max": "Branch name cannot exceed 150 characters",
    }),
    branch_code: Joi.string().min(1).max(50).required().messages({
      "string.empty": "Branch code is required",
      "string.max": "Branch code cannot exceed 50 characters",
    }),
    address: Joi.string().min(1).max(300).required().messages({
      "string.empty": "Address is required",
      "string.max": "Address cannot exceed 300 characters",
    }),
    city: Joi.string().min(1).max(100).required().messages({
      "string.empty": "City is required",
      "string.max": "City cannot exceed 100 characters",
    }),
    state: Joi.string().min(1).max(100).required().messages({
      "string.empty": "State is required",
      "string.max": "State cannot exceed 100 characters",
    }),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .optional()
      .messages({
        "string.pattern.base": "Pincode must be exactly 6 digits",
      }),
    email: emailValidation.optional(),
    phone: phoneValidation.optional(),
    is_active: Joi.boolean().default(true),
    //tenant_id: commonFields.tenant_id,
    created_by: Joi.string().max(50).default("SYSTEM"),
  }),

  updateBranch: Joi.object({
    branch_name: Joi.string().min(1).max(150).optional(),
    branch_code: Joi.string().min(1).max(50).optional(),
    address: Joi.string().min(1).max(300).optional(),
    city: Joi.string().min(1).max(100).optional(),
    state: Joi.string().min(1).max(100).optional(),
    pincode: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .optional(),
    email: emailValidation.optional(),
    phone: phoneValidation.optional(),
    is_active: Joi.boolean().optional(),
    updated_by: Joi.string().max(50).optional(),
  }).min(1),
};

// ============================================================================
// PROJECT MODULE VALIDATIONS
// ============================================================================

const projectValidation = {
  createProject: Joi.object({
    Project_name: Joi.string().min(1).max(40).required().messages({
      "string.empty": "Project name is required",
      "string.max": "Project name cannot exceed 40 characters",
    }),
    Project_type: Joi.string().max(255).optional(),
    Project_cost: Joi.number().integer().min(0).required().messages({
      "number.min": "Project cost cannot be negative",
    }),
    Margin: Joi.string().max(50).optional(),
    Project_Estimation_Cost: Joi.number().integer().min(0).optional(),
    Project_start_date: dateValidation.required().messages({
      "any.required": "Project start date is required",
    }),
    Estimated_end_date: dateValidation.required().messages({
      "any.required": "Estimated end date is required",
    }),
    Site_location: Joi.string().max(255).optional(),
    Contractor: Joi.string().max(40).optional(),
    Site_supervisor: Joi.string().max(40).optional(),
    ProjectStatus: Joi.string().max(30).optional(),
    Photo: Joi.string().max(255).optional(),
    Username: Joi.string().max(50).optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  })
    .custom((value, helpers) => {
      // Validate that end date is after start date
      if (value.Estimated_end_date && value.Project_start_date) {
        const startDate = new Date(value.Project_start_date);
        const endDate = new Date(value.Estimated_end_date);
        if (endDate <= startDate) {
          return helpers.error("date.endAfterStart");
        }
      }
      return value;
    })
    .messages({
      "date.endAfterStart": "Estimated end date must be after start date",
    }),

  updateProject: Joi.object({
    Project_name: Joi.string().min(1).max(40).optional(),
    Project_type: Joi.string().max(255).optional(),
    Project_cost: Joi.number().integer().min(0).optional(),
    Margin: Joi.string().max(50).optional(),
    Project_Estimation_Cost: Joi.number().integer().min(0).optional(),
    Project_start_date: dateValidation.optional(),
    Estimated_end_date: dateValidation.optional(),
    Site_location: Joi.string().max(255).optional(),
    Contractor: Joi.string().max(40).optional(),
    Site_supervisor: Joi.string().max(40).optional(),
    Project_status: Joi.string().max(30).optional(),
    Photo: Joi.string().max(255).optional(),
    Project_id: Joi.number().integer().positive().required().messages({
      "any.required": "Project ID is required for update",
    }),
  }).min(1),
};

// ============================================================================
// ORDER MODULE VALIDATIONS
// ============================================================================

const orderValidation = {
  createOrder: Joi.array()
    .items(
      Joi.object({
        Project_id: Joi.number().integer().positive().required(),
        Project_name: Joi.string().min(1).max(40).required(),
        Material_Name: Joi.string().min(1).max(100).required(),
        Quantity: Joi.number().precision(2).positive().optional(),
        Unit: Joi.string().max(50).optional(),
        Order_date: dateValidation.required(),
        Delivery_Date: dateValidation.required(),
        Supplier_name: Joi.string().max(50).optional(),
        Supplier_Contact: phoneValidation.optional(),
        Rate: Joi.number().precision(2).min(0).optional(),
        Amount: Joi.number().precision(2).min(0).optional(),
        Remarks: Joi.string().max(200).optional(),
        Paid: Joi.number().integer().min(0).optional(),
        Balance: Joi.number().integer().min(0).optional(),
        Status: Joi.string().max(50).optional(),
        Site_supervisor: Joi.string().max(100).optional(),
        Photos: Joi.string().max(255).optional(),
        Payment_Date: dateValidation.optional(),
        username: Joi.string().max(100).optional(),
        datetime: dateValidation.optional(),
      }).custom((value, helpers) => {
        if (value.Delivery_Date && value.Order_date) {
          const orderDate = new Date(value.Order_date);
          const deliveryDate = new Date(value.Delivery_Date);

          if (deliveryDate < orderDate) {
            return helpers.error("date.deliveryAfterOrder");
          }
        }
        return value;
      })
    )
    .messages({
      "date.deliveryAfterOrder": "Delivery date must be on or after order date",
    }),
  updateOrder: Joi.array()
    .items(
      Joi.object({
        Order_id: Joi.number().integer().positive().required(), // required for update
        Project_id: Joi.number().integer().positive().optional(),
        Project_name: Joi.string().min(1).max(40).optional(),
        Material_Name: Joi.string().min(1).max(100).optional(),
        Quantity: Joi.number().precision(2).positive().optional(),
        Unit: Joi.string().max(50).optional(),
        Order_date: dateValidation.optional(),
        Delivery_Date: dateValidation.optional(),
        Supplier_name: Joi.string().max(50).optional(),
        Supplier_Contact: phoneValidation.optional(),
        Rate: Joi.number().precision(2).min(0).optional(),
        Amount: Joi.number().precision(2).min(0).optional(),
        Remarks: Joi.string().max(200).allow(null).optional(),
        Site_supervisor: Joi.string().max(100).allow(null).optional(),
        Photos: Joi.string().max(255).allow(null).optional(),
        Paid: Joi.number().integer().min(0).optional(),
        Balance: Joi.number().integer().min(0).optional(),
        Status: Joi.string().max(50).optional(),
        Payment_Date: dateValidation.optional(),
      }).min(2) // id + at least one field
    )
    .min(1),
};

// ============================================================================
// MATERIAL MODULE VALIDATIONS
// ============================================================================

const materialValidation = {
  materialList: Joi.object({
    project_id: Joi.number().integer().positive().optional(),
    material_name: Joi.string().max(100).optional(),
    supplier_name: Joi.string().max(30).optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  materialUsed: Joi.object({
    id: Joi.number().integer().positive().optional(),
    Project_id: Joi.number().integer().positive().required(),
    Project_name: Joi.string().min(1).max(40).required(),
    DATE: dateValidation.required(),
    Material_List: Joi.string().min(1).max(100).required(),
    Stock_List: Joi.number().integer().min(0).optional(),
    Material_Used: Joi.number().integer().positive().required(),
    Created_by: Joi.string().max(100).optional(),
    CREATED_DATETIME: dateValidation.optional(),
    LAST_UPDATED_BY: Joi.string().max(100).optional(),
    LAST_UPDATED_DATETIME: dateValidation.optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  editMaterialUsed: Joi.object({
    id: Joi.number().integer().positive().required(),
    Material_Used: Joi.number().integer().positive().optional(),
    DATE: dateValidation.optional(),
    LAST_UPDATED_BY: Joi.string().max(100).optional(),
    LAST_UPDATED_DATETIME: dateValidation.optional(),
  }).min(1),

  measurementDetails: Joi.object({
    Project_id: Joi.number().integer().positive().required(),
    Project_name: Joi.string().min(1).max(40).required(),
    DATE: dateValidation.required(),
    Measurement: Joi.string().max(50).optional(),
    Units: Joi.number().integer().min(0).optional(),
    Nos: Joi.number().precision(4).optional(),
    Length: Joi.number().precision(4).optional(),
    breadth: Joi.number().precision(4).optional(),
    D_H: Joi.number().precision(4).optional(),
    Quantity: Joi.number().precision(4).optional(),
    Rate: Joi.number().integer().min(0).optional(),
    Amount: Joi.number().integer().min(0).optional(),
    Remarks: Joi.string().max(100).optional(),
    Photos: Joi.string().max(255).optional(),
    Paid: Joi.number().integer().min(0).optional(),
    Balance: Joi.number().integer().min(0).optional(),
    Status: Joi.string().max(50).optional(),
    Created_by: Joi.string().max(100).optional(),
    CREATED_DATETIME: dateValidation.optional(),
    LAST_UPDATED_BY: Joi.string().max(100).optional(),
    LAST_UPDATED_DATETIME: dateValidation.optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  updateMaterial: Joi.object({
    id: Joi.number().integer().positive().required(),
    Material_Name: Joi.string().min(1).max(100).optional(),
    Supplier_Name: Joi.string().max(30).optional(),
    Supplier_Contact: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional()
      .messages({
        "string.pattern.base": "Supplier contact must be exactly 10 digits",
      }),
  }).min(1),

  materialDelete: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

// ============================================================================
// LABOUR MODULE VALIDATIONS
// ============================================================================

const labourValidation = {
  labourDetails: Joi.object({
    Project_id: Joi.number().integer().positive().required(),
    Project_name: Joi.string().min(1).max(40).required(),
    DATE: dateValidation.required(),
    Contractor: Joi.string().max(35).optional(),
    Labour_types: Joi.string().min(1).max(100).required(),
    No_Of_Persons: Joi.number().integer().positive().required(),
    Unit: Joi.number().integer().min(0).optional(),
    Salary: Joi.number().integer().min(0).default(0),
    Ratio: Joi.number().integer().min(0).default(0),
    Site_location: Joi.string().max(255).optional(),
    Total: Joi.number().integer().min(0).default(0),
    Site_supervisor: Joi.string().max(40).optional(),
    work_verified_by: Joi.string().max(100).optional(),
    Paid: Joi.number().integer().min(0).optional(),
    Balance: Joi.number().integer().min(0).optional(),
    Status: Joi.string().max(50).optional(),
    Check_list: Joi.number().integer().optional(),
    Created_by: Joi.string().max(100).optional(),
    CREATED_DATETIME: dateValidation.optional(),
    LAST_UPDATED_BY: Joi.string().max(100).optional(),
    LAST_UPDATED_DATETIME: dateValidation.optional(),
    Payment_Date: dateValidation.optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  updateLabour: Joi.object({
    id: Joi.number().integer().positive().required(),
    Contractor: Joi.string().max(35).optional(),
    Labour_types: Joi.string().min(1).max(100).optional(),
    No_Of_Persons: Joi.number().integer().positive().optional(),
    Unit: Joi.number().integer().min(0).optional(),
    Salary: Joi.number().integer().min(0).optional(),
    Ratio: Joi.number().integer().min(0).optional(),
    Site_location: Joi.string().max(255).optional(),
    Total: Joi.number().integer().min(0).optional(),
    Site_supervisor: Joi.string().max(40).optional(),
    work_verified_by: Joi.string().max(100).optional(),
    Paid: Joi.number().integer().min(0).optional(),
    Balance: Joi.number().integer().min(0).optional(),
    Status: Joi.string().max(50).optional(),
    Check_list: Joi.number().integer().optional(),
    LAST_UPDATED_BY: Joi.string().max(100).optional(),
    LAST_UPDATED_DATETIME: dateValidation.optional(),
    Payment_Date: dateValidation.optional(),
  }).min(1),

  labourDelete: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  labourPayment: Joi.object({
    id: Joi.number().integer().positive().optional(),
    labour_id: Joi.number().integer().positive().optional(),
    amount: Joi.number().integer().min(0).optional(),
    payment_date: dateValidation.optional(),
    payment_method: Joi.string()
      .valid("Cash", "Bank Transfer", "Cheque")
      .optional(),
  }),

  labourPaymentUpdate: Joi.object({
    labour_ids: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
    payment_date: dateValidation.optional(),
    amount: Joi.number().integer().min(0).optional(),
  }),
};

// ============================================================================
// PAYMENT MODULE VALIDATIONS
// ============================================================================

const paymentValidation = {
  newPayment: Joi.object({
    Project_id: Joi.number().integer().positive().optional(),
    Payment_date: dateValidation.required(),
    Amount: Joi.number().precision(2).positive().required(),
    Created_by: Joi.string().max(50).optional(),
    Created_Datetime: dateValidation.optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  updatePaymentDetails: Joi.object({
    id: Joi.number().integer().positive().required(),
    Project_id: Joi.number().integer().positive().optional(),
    Payment_date: dateValidation.optional(),
    Amount: Joi.number().precision(2).positive().optional(),
    Updated_by: Joi.string().max(50).optional(),
    Updated_datetime: dateValidation.optional(),
  }).min(1),

  materialPaymentsUpdate: Joi.object({
    payment_ids: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
    payment_date: dateValidation.optional(),
    amount: Joi.number().integer().min(0).optional(),
  }),

  materialPayment: Joi.object({
    Project_Id: Joi.number().integer().positive().optional(),
    Bill_no: Joi.number().integer().positive().optional(),
    Material_name: Joi.string().max(50).optional(),
    Supplier_name: Joi.string().max(50).optional(),
    Material_amount: Joi.string().max(50).optional(),
    Payment_Date: dateValidation.optional(),
    Amount: Joi.number().integer().min(0).optional(),
    Created_by: Joi.string().max(50).optional(),
    Created_Datetime: dateValidation.optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),
};

// ============================================================================
// MASTER DATA MODULE VALIDATIONS
// ============================================================================

const masterValidation = {
  labourList: Joi.object({
    labour_details: Joi.string().max(100).optional(),
    contractor: Joi.string().max(35).optional(),
    salary: Joi.number().integer().min(0).optional(),
    ratio: Joi.number().integer().min(0).optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  materialList: Joi.object({
    material_name: Joi.string().max(100).optional(),
    supplier_name: Joi.string().max(30).optional(),
    supplier_contact: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  contractorList: Joi.object({
    contractor_name: Joi.string().max(35).optional(),
    contact: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  supplierList: Joi.object({
    supplier_name: Joi.string().max(30).optional(),
    contact: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .optional(),
    //tenant_id: commonFields.tenant_id,
    //branch_id: commonFields.branch_id
  }),

  labourTypeDelete: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),
};

// ============================================================================
// USER BRANCH MODULE VALIDATIONS
// ============================================================================

const userBranchValidation = {
  createUserBranch: Joi.object({
    branch_id: Joi.number().integer().positive().required(),
    user_id: Joi.number().integer().positive().required(),
    //tenant_id: commonFields.tenant_id,
    created_by: Joi.string().max(30).default("admin"),
  }),

  updateUserBranch: Joi.object({
    branch_id: Joi.number().integer().positive().optional(),
    user_id: Joi.number().integer().positive().optional(),
    updated_by: Joi.string().max(30).optional(),
  }).min(1),

  getUserBranches: Joi.object({
    //tenant_id: commonFields.tenant_id,
    user_id: Joi.number().integer().positive().optional(),
    branch_id: Joi.number().integer().positive().optional(),
  }),

  deleteUserBranch: Joi.object({
    branch_id: Joi.number().integer().positive().required(),
    user_id: Joi.number().integer().positive().required(),
    tenant_id: commonFields.tenant_id,
  }),
};

// ============================================================================
// EXPORT ALL VALIDATIONS
// ============================================================================

module.exports = {
  userValidation,
  tenantValidation,
  branchValidation,
  projectValidation,
  orderValidation,
  materialValidation,
  labourValidation,
  paymentValidation,
  masterValidation,
  userBranchValidation,

  // Individual validation functions for easy use
  validateUserLogin: (data) => userValidation.login.validate(data),
  validateCreateUser: (data) => userValidation.createUser.validate(data),
  validateUpdateUser: (data) => userValidation.updateUser.validate(data),

  validateCreateTenant: (data) => tenantValidation.createTenant.validate(data),
  validateUpdateTenant: (data) => tenantValidation.updateTenant.validate(data),

  validateCreateBranch: (data) => branchValidation.createBranch.validate(data),
  validateUpdateBranch: (data) => branchValidation.updateBranch.validate(data),

  validateCreateProject: (data) =>
    projectValidation.createProject.validate(data),
  validateUpdateProject: (data) =>
    projectValidation.updateProject.validate(data),

  validateCreateOrder: (data) => orderValidation.createOrder.validate(data),
  validateUpdateOrder: (data) => orderValidation.updateOrder.validate(data),

  validateMaterialUsed: (data) =>
    materialValidation.materialUsed.validate(data),
  validateMeasurementDetails: (data) =>
    materialValidation.measurementDetails.validate(data),

  validateLabourDetails: (data) =>
    labourValidation.labourDetails.validate(data),
  validateUpdateLabour: (data) => labourValidation.updateLabour.validate(data),

  validateNewPayment: (data) => paymentValidation.newPayment.validate(data),
  validateUpdatePayment: (data) =>
    paymentValidation.updatePaymentDetails.validate(data),

  validateCreateUserBranch: (data) =>
    userBranchValidation.createUserBranch.validate(data),
  validateUpdateUserBranch: (data) =>
    userBranchValidation.updateUserBranch.validate(data),
};
