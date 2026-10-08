import pool from '../config/db.js';

/**
 * User Model - handles all database queries for users table
 */
class UserModel {
  /**
   * Find a user by their email address
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  static async findByEmail(email) {
    const query = 'SELECT id, name, email, mobile, password_hash, created_at, updated_at FROM users WHERE email = ? LIMIT 1';
    const [rows] = await pool.query(query, [email.toLowerCase().trim()]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a user by their mobile number
   * @param {string} mobile
   * @returns {Promise<object|null>}
   */
  static async findByMobile(mobile) {
    const query = 'SELECT id, name, email, mobile, password_hash, created_at, updated_at FROM users WHERE mobile = ? LIMIT 1';
    const [rows] = await pool.query(query, [mobile.trim()]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a user by their primary ID
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  static async findById(id) {
    const query = 'SELECT id, name, email, mobile, created_at, updated_at FROM users WHERE id = ? LIMIT 1';
    const [rows] = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Insert a new user record into the database
   * @param {object} userData
   * @param {string} userData.name
   * @param {string} userData.email
   * @param {string} userData.mobile
   * @param {string} userData.passwordHash
   * @returns {Promise<object>}
   */
  static async createUser({ name, email, mobile, passwordHash }) {
    const query = `
      INSERT INTO users (name, email, mobile, password_hash)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [
      name.trim(),
      email.toLowerCase().trim(),
      mobile.trim(),
      passwordHash
    ]);

    return {
      id: result.insertId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim()
    };
  }
}

export default UserModel;
