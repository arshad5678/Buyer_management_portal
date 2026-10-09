import multer from 'multer';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Allowed extensions and corresponding MIME types
const ALLOWED_EXTENSIONS = new Set(['.csv', '.xls', '.xlsx']);
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/csv',
  'text/x-csv',
  'application/x-csv',
  'text/comma-separated-values'
]);

// Memory storage keeps file buffers in RAM, avoiding permanent or temporary disk artifacts
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Validate extension
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error('Unsupported file format. Only .csv, .xls, and .xlsx files are supported');
    error.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(error, false);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    const error = new Error('Unsupported Media Type. File MIME type does not match supported formats');
    error.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
}).single('file');

/**
 * Middleware wrapper to handle Multer errors and return exact HTTP status codes (413, 415, 400)
 */
export const uploadBuyerFile = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          status: 'error',
          message: 'File size exceeds maximum allowed limit of 5 MB'
        });
      }

      if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(415).json({
          status: 'error',
          message: err.message
        });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          status: 'error',
          message: 'Unexpected field name. Upload file must use field name "file"'
        });
      }

      return res.status(400).json({
        status: 'error',
        message: err.message || 'File upload error'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Please provide a file in the "file" field'
      });
    }

    next();
  });
};

export default uploadBuyerFile;
