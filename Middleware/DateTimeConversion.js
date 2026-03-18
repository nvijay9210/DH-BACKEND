// src/Middleware/DateTimeConversion.js

/**
 * DATE_FIELDS: Fields that store ONLY date (YYYY-MM-DD) in MySQL
 * These should NOT be converted to ISO format (MySQL DATE columns)
 */
const DATE_ONLY_FIELDS = [
  // order_details
  'Order_date',
  'Delivery_Date',
  'Payment_Date',
  'datetime',
  
  // materials_used
  'Date',
  'DATE',
  
  // labour_worked_details
  'Payment_Date',
  
  // daily_process_details
  'date',
  
  // material_stock_list
  'Pro_Date',
  
  // material_payments
  'Payment_Date',
  
  // payment_details
  'Payment_date',
  
  // project_list
  'Project_start_date',
  'Estimated_end_date',
  
  // mas_material_list
  'created_datetime',
  
  // mas_labour_details
  'created_datetime',
  
  // user
  'Created_date',
  'Updated_date',
  
  // project_status
  'Created_date',
  
  // daily_process_details, labour_worked_details, materials_used, order_details
  'CREATED_DATETIME',
  'LAST_UPDATED_DATETIME',
  
  // Search/Filter fields
  'start_date',
  'end_date',
  'date',
  'Format_date',

  'createdDate',
  'updatedDateTime'
];

/**
 * DATETIME_FIELDS: Fields that store full datetime in MySQL
 * These SHOULD be converted to ISO format (MySQL DATETIME/TIMESTAMP columns)
 */
const DATETIME_FIELDS = [
  // tenant
  'created_at',
  'updated_at',
  
  // branch
  'created_at',
  'updated_at',
  
  // login_history
  'login_time',
  'logout_time',
  'created_at',
  
  // user
  'last_login',
  
  // user_activity
  'login_time',
  'logout_time',
  'created_at',
  'last_activity_time',
  
  // userbranch
  'created_at',
  'updated_at',
  
  // material_payments
  'Created_Datetime',
  
  // General
  'currentDate',
  'createdDate',
  'created_at',
  'updated_at',

  'LAST_UPDATED_DATETIME'
];

/**
 * All date fields combined for matching
 */
const DATE_FIELDS = [...DATE_ONLY_FIELDS, ...DATETIME_FIELDS];

/**
 * Convert ANY date format → Local Date String (YYYY-MM-DD)
 * Used for API Response (Database → Frontend)
 */
const utcToLocalDate = (utcDate) => {
  if (utcDate === null || utcDate === undefined || utcDate === '') return null;
  
  // Already in YYYY-MM-DD format (avoid double conversion)
  if (typeof utcDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(utcDate)) {
    return utcDate;
  }
  
  // Convert Date object or ISO string to local date
  const date = new Date(utcDate);
  if (isNaN(date.getTime())) return null;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Convert Local Date String → MySQL-compatible format
 * Used for API Request (Frontend → Database)
 */
const localDateToMysql = (localDate, fieldName) => {
  if (!localDate || typeof localDate !== 'string') return null;
  
  // If already ISO string, return as-is
  if (localDate.includes('T') && localDate.endsWith('Z')) {
    return localDate;
  }
  
  // For DATE-only fields: return YYYY-MM-DD (MySQL DATE columns)
  if (DATE_ONLY_FIELDS.includes(fieldName)) {
    const date = new Date(localDate);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // For DATETIME fields: return full ISO string (MySQL DATETIME/TIMESTAMP columns)
  const date = new Date(localDate);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
};

/**
 * Recursively convert date fields: UTC/Date Object → Local String (for Response)
 */
const convertResponseDates = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertResponseDates(item));
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    // Handle date fields: strings OR Date objects (from MySQL)
    if (DATE_FIELDS.includes(key) && value && (typeof value === 'string' || value instanceof Date)) {
      converted[key] = utcToLocalDate(value);
    } 
    // Recurse into nested objects (but skip Date objects)
    else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      converted[key] = convertResponseDates(value);
    } 
    // Keep all other values unchanged
    else {
      converted[key] = value;
    }
  }
  return converted;
};

/**
 * Recursively convert date fields: Local String → MySQL format (for Request)
 */
const convertRequestDates = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertRequestDates(item));
  
  const converted = {};
  for (const [key, value] of Object.entries(obj)) {
    // Handle date fields that are local date strings
    if (DATE_FIELDS.includes(key) && typeof value === 'string' && value) {
      converted[key] = localDateToMysql(value, key);
    } 
    // Recurse into nested objects
    else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      converted[key] = convertRequestDates(value);
    } 
    // Keep all other values unchanged
    else {
      converted[key] = value;
    }
  }
  return converted;
};

/**
 * Express Middleware - Auto-converts dates on Request/Response
 */
const dateMiddleware = (req, res, next) => {
  // Convert incoming request: Local String → MySQL format
  if (req.body) {
    req.body = convertRequestDates(req.body);
  }
  
  // Convert outgoing response: MySQL/Date Object → Local String
  const originalJson = res.json;
  res.json = function(data) {
    if (data) {
      data = convertResponseDates(data);
    }
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = dateMiddleware;