import crypto from 'crypto';
import pool from '../config/db.js';

/**
 * Session Model - manages database persistence for sessions, refresh tokens, and idle tracking
 */
class SessionModel {
  /**
   * Cryptographically hash a raw refresh token using SHA-256
   * @param {string} token - Raw refresh token
   * @returns {string} SHA-256 hex digest
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random token string
   * @returns {string} 80-char hex string
   */
  static generateToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Create a new session in MySQL
   * @param {object} params
   * @param {number} params.userId
   * @param {string} params.refreshTokenHash
   * @param {Date} params.expiresAt
   * @returns {Promise<object>} Created session details
   */
  static async createSession({ userId, refreshTokenHash, expiresAt }) {
    const query = `
      INSERT INTO sessions (user_id, refresh_token_hash, expires_at, last_active_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await pool.query(query, [userId, refreshTokenHash, expiresAt]);

    return {
      id: result.insertId,
      userId,
      refreshTokenHash,
      expiresAt
    };
  }

  /**
   * Find a session by its primary ID
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  static async findById(id) {
    const query = 'SELECT * FROM sessions WHERE id = ? LIMIT 1';
    const [rows] = await pool.query(query, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a session by the hash of its refresh token
   * @param {string} refreshTokenHash
   * @returns {Promise<object|null>}
   */
  static async findByTokenHash(refreshTokenHash) {
    const query = 'SELECT * FROM sessions WHERE refresh_token_hash = ? LIMIT 1';
    const [rows] = await pool.query(query, [refreshTokenHash]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Update the last_active_at timestamp for an active session
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  static async updateLastActive(id) {
    const query = 'UPDATE sessions SET last_active_at = NOW() WHERE id = ? AND revoked_at IS NULL';
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Atomically rotate the refresh token hash of an active session
   * @param {number} id
   * @param {string} oldTokenHash
   * @param {string} newTokenHash
   * @returns {Promise<boolean>} True if successfully rotated
   */
  static async rotateToken(id, oldTokenHash, newTokenHash) {
    const query = `
      UPDATE sessions
      SET refresh_token_hash = ?, last_active_at = NOW()
      WHERE id = ? AND refresh_token_hash = ? AND revoked_at IS NULL
    `;
    const [result] = await pool.query(query, [newTokenHash, id, oldTokenHash]);
    return result.affectedRows > 0;
  }

  /**
   * Revoke a specific session
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  static async revokeSession(id) {
    const query = 'UPDATE sessions SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL';
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Revoke a session by token hash
   * @param {string} refreshTokenHash
   * @returns {Promise<boolean>}
   */
  static async revokeByTokenHash(refreshTokenHash) {
    const query = 'UPDATE sessions SET revoked_at = NOW() WHERE refresh_token_hash = ? AND revoked_at IS NULL';
    const [result] = await pool.query(query, [refreshTokenHash]);
    return result.affectedRows > 0;
  }

  /**
   * Revoke all active sessions belonging to a user (used upon reuse detection)
   * @param {number} userId
   * @returns {Promise<number>} Number of revoked sessions
   */
  static async revokeAllUserSessions(userId) {
    const query = 'UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL';
    const [result] = await pool.query(query, [userId]);
    return result.affectedRows;
  }
}

export default SessionModel;
