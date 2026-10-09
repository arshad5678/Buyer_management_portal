import pool from '../config/db.js';

/**
 * Buyer Model - handles database persistence and transactions for buyers table
 */
class BuyerModel {
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
   * Count total buyers for a user
   * @param {number} userId
   * @returns {Promise<number>}
   */
  static async countByUserId(userId) {
    const query = 'SELECT COUNT(*) as count FROM buyers WHERE user_id = ?';
    const [rows] = await pool.query(query, [userId]);
    return rows[0].count;
  }
}

export default BuyerModel;
