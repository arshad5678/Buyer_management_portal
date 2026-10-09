import { parseAndValidateBuyersFile } from '../services/buyerParserService.js';
import BuyerModel from '../models/buyerModel.js';

/**
 * Handle multipart buyer file upload (.csv, .xls, .xlsx)
 * POST /api/buyers/upload
 */
export const uploadBuyers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Please provide a file in the "file" field'
      });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Uploaded file is empty'
      });
    }

    // Always use the authenticated identity established by authentication middleware
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized. Valid authenticated user session required'
      });
    }

    // Parse and validate the entire file content before performing database writes
    let parseResult;
    try {
      parseResult = await parseAndValidateBuyersFile(req.file.buffer, req.file.originalname);
    } catch (parseError) {
      return res.status(400).json({
        status: 'error',
        message: parseError.message || 'Failed to parse file'
      });
    }

    // If validation failed, reject with HTTP 400 and provide row-level errors
    if (!parseResult.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed for uploaded file',
        errors: parseResult.errors
      });
    }

    const rowsToInsert = parseResult.rows;

    // Perform atomic transaction insert into MySQL buyers table
    const insertedCount = await BuyerModel.bulkCreateBuyers(userId, rowsToInsert);

    return res.status(201).json({
      status: 'success',
      message: 'Buyer data imported successfully',
      data: {
        totalRows: rowsToInsert.length,
        insertedRows: insertedCount,
        failedRows: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  uploadBuyers
};
