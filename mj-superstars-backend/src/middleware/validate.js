// ============================================================
// Validation Middleware - Auto-checks express-validator rules
// ============================================================

import { validationResult } from 'express-validator';

/**
 * Middleware that checks express-validator results.
 * Place after validation rules in the middleware chain:
 *   router.post('/', [body('field').isInt()], validate, handler)
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
};

export default validate;
