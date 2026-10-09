import pool from '../config/db.js';

/**
 * Buyer Model - handles database persistence, queries, and transactions for buyers table
 */
class BuyerModel {
  /**
   * Helper to escape MySQL LIKE wildcards (%, _, \)
   * @param {string} str
   * @returns {string}
   */
  static escapeLikeWildcards(str) {
    return str.replace(/[%_\\]/g, '\\$&');
  }

  /**
   * Atomically insert multiple buyer records in a single transaction
   * @param {number} userId - Authenticated user ID from req.user
   * @param {Array<object>} buyers - Validated buyer rows
   * @returns {Promise<number>} Number of successfully inserted rows
   */
  static async bulkCreateBuyers(userId, buyers) {
    if (!buyers || buyers.length === 0) {
      return 0;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const query = `
        INSERT INTO buyers (
          user_id,
          name,
          email,
          mobile,
          address,
          total_invoice_amount,
          total_amount_paid,
          total_amount_due
        ) VALUES ?
      `;

      const values = buyers.map((b) => [
        userId,
        b.name,
        b.email,
        b.mobile,
        b.address,
        b.total_invoice_amount,
        b.total_amount_paid,
        b.total_amount_due
      ]);

      const [result] = await connection.query(query, [values]);

      await connection.commit();
      return result.affectedRows;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Fetch paginated buyers for a specific user with optional search filtering
   * @param {object} params
   * @param {number} params.userId
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} [params.search]
   * @returns {Promise<Array<object>>}
   */
  static async findBuyersByUserId({ userId, page = 1, limit = 10, search = '' }) {
    const offset = (page - 1) * limit;
    const trimmedSearch = (search || '').trim();

    if (trimmedSearch) {
      const searchPattern = `%${this.escapeLikeWildcards(trimmedSearch)}%`;
      const query = `
        SELECT
          id,
          name,
          email,
          mobile,
          address,
          total_invoice_amount,
          total_amount_paid,
          total_amount_due
        FROM buyers
        WHERE user_id = ?
          AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)
        ORDER BY id DESC
        LIMIT ? OFFSET ?
      `;
      const [rows] = await pool.query(query, [
        userId,
        searchPattern,
        searchPattern,
        searchPattern,
        Number(limit),
        Number(offset)
      ]);
      return rows;
    }

    const query = `
      SELECT
        id,
        name,
        email,
        mobile,
        address,
        total_invoice_amount,
        total_amount_paid,
        total_amount_due
      FROM buyers
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(query, [userId, Number(limit), Number(offset)]);
    return rows;
  }

  /**
   * Count total buyers matching user and optional search filters
   * @param {object} params
   * @param {number} params.userId
   * @param {string} [params.search]
   * @returns {Promise<number>}
   */
  static async countBuyersByUserId({ userId, search = '' }) {
    const trimmedSearch = (search || '').trim();

    if (trimmedSearch) {
      const searchPattern = `%${this.escapeLikeWildcards(trimmedSearch)}%`;
      const query = `
        SELECT COUNT(*) as total
        FROM buyers
        WHERE user_id = ?
          AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)
      `;
      const [rows] = await pool.query(query, [
        userId,
        searchPattern,
        searchPattern,
        searchPattern
      ]);
      return rows[0].total;
    }

    const query = 'SELECT COUNT(*) as total FROM buyers WHERE user_id = ?';
    const [rows] = await pool.query(query, [userId]);
    return rows[0].total;
  }
}

export default BuyerModel;
