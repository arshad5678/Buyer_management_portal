-- =====================================================================
-- Database Schema: Buyer Management Portal
-- Target Database: MySQL 8.0+
-- Description: Complete schema for users, buyers, constraints, and indexes
-- =====================================================================

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS buyer_management_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE buyer_management_portal;

-- 2. Users Table
-- Stores portal users with credentials and timestamps
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Buyers Table
-- Stores buyer information associated with a portal user
CREATE TABLE IF NOT EXISTS buyers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  mobile VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  total_invoice_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_amount_paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_amount_due DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Key Constraint (Cascades on delete of referencing user)
  CONSTRAINT fk_buyers_user_id
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE,

  -- Indexes for buyer search and user-specific queries
  INDEX idx_buyers_user_id (user_id),
  INDEX idx_buyers_name (name),
  INDEX idx_buyers_email (email),
  INDEX idx_buyers_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
