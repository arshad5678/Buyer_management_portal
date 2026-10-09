import { parseAndValidateBuyersFile } from '../services/buyerParserService.js';
import BuyerModel from '../models/buyerModel.js';

// POST /api/buyers/upload
export const uploadBuyers = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded. Please provide a file in the "file" field'
      });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Uploaded file is empty' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized. Valid authenticated user session required'
      });
    }

    let parseResult;
    try {
      parseResult = await parseAndValidateBuyersFile(req.file.buffer, req.file.originalname);
    } catch (parseError) {
      return res.status(400).json({
        status: 'error',
        message: parseError.message || 'Failed to parse file'
      });
    }

    if (!parseResult.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed for uploaded file',
        errors: parseResult.errors
      });
    }

    const insertedCount = await BuyerModel.bulkCreateBuyers(userId, parseResult.rows);

    return res.status(201).json({
      status: 'success',
      message: 'Buyer data imported successfully',
      data: {
        totalRows: parseResult.rows.length,
        insertedRows: insertedCount,
        failedRows: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/buyers
export const getBuyers = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Unauthorized. Valid authenticated user session required'
      });
    }

    let page = 1;
    if (req.query.page !== undefined) {
      const pageStr = String(req.query.page).trim();
      const parsedPage = Number(pageStr);
      if (!/^\d+$/.test(pageStr) || !Number.isInteger(parsedPage) || parsedPage < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid page number. Page must be a positive integer greater than or equal to 1'
        });
      }
      page = parsedPage;
    }

    let limit = 10;
    if (req.query.limit !== undefined) {
      const limitStr = String(req.query.limit).trim();
      const parsedLimit = Number(limitStr);
      if (!/^\d+$/.test(limitStr) || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid limit. Limit must be a positive integer between 1 and 100'
        });
      }
      limit = parsedLimit;
    }

    const search = req.query.search ? String(req.query.search).trim() : '';

    const [buyers, totalRecords] = await Promise.all([
      BuyerModel.findBuyersByUserId({ userId, page, limit, search }),
      BuyerModel.countBuyersByUserId({ userId, search })
    ]);

    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);

    return res.status(200).json({
      status: 'success',
      data: {
        buyers,
        pagination: { page, limit, totalRecords, totalPages }
      }
    });
  } catch (error) {
    next(error);
  }
};

export default { uploadBuyers, getBuyers };
