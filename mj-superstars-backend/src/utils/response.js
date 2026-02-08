// ============================================================
// Response Helper Utilities
// ============================================================
// Standardized API response format for consistency across routes
// All responses follow: { success: boolean, data?: any, error?: string, code?: string, pagination?: any }

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {void}
 */
export const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {string} code - Error code for client handling (optional)
 * @returns {void}
 */
export const errorResponse = (res, message, statusCode = 400, code = null) => {
  const response = { success: false, error: message };
  if (code) response.code = code;
  return res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {*} data - Response data array
 * @param {Object} pagination - Pagination metadata { limit, offset, total }
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {void}
 */
export const paginatedResponse = (res, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    pagination
  });
};

export default {
  successResponse,
  errorResponse,
  paginatedResponse
};
