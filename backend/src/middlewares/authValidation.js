import { body, validationResult } from 'express-validator';

/**
 * Middleware to format and return validation errors with HTTP 400
 */
export const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(400).json({
      status: 'error',
      message: errorList[0].msg,
      errors: errorList.map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Normalization helper for Indian mobile numbers
 * Extracts 10 digits if passed with +91, 0, spaces, or dashes
 */
export const normalizeMobile = (value) => {
  if (typeof value !== 'string') return '';
  // Remove non-digit characters except leading plus
  let cleaned = value.trim().replace(/[\s-]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

/**
 * Registration request validation chain
 */
export const registerValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('mobile')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .customSanitizer(normalizeMobile)
    .matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+={}[\]:;"'<>,.?/\\|`~])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

export const validateRegister = [
  ...registerValidationRules,
  validateResult
];
