-- MySQL 8+ schema for Adopt-A-Reef PHP API
-- Run: mysql -u USER -p DATABASE < schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS volunteer_signups;
DROP TABLE IF EXISTS volunteer_works;
DROP TABLE IF EXISTS donations;
DROP TABLE IF EXISTS adoptions;
DROP TABLE IF EXISTS corals;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE corals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(512) NOT NULL,
  image TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INT NOT NULL,
  stock INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE adoptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  coral_id CHAR(36) NULL,
  coral_name VARCHAR(512) NOT NULL,
  coral_image TEXT NOT NULL,
  amount INT NOT NULL,
  price INT NOT NULL,
  adopted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_adoptions_user (user_id),
  CONSTRAINT fk_adoptions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE donations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  amount INT NOT NULL,
  donor_name VARCHAR(512) NULL,
  donor_email VARCHAR(512) NULL,
  donated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_donations_user (user_id),
  CONSTRAINT fk_donations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE volunteer_works (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(512) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(512) NOT NULL,
  scheduled_for DATETIME NOT NULL,
  end_date DATETIME NULL,
  hours INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  category VARCHAR(32) NOT NULL DEFAULT 'other',
  max_volunteers INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE volunteer_signups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  work_id CHAR(36) NOT NULL,
  signed_up_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_work (user_id, work_id),
  KEY idx_signups_work (work_id),
  CONSTRAINT fk_signups_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_signups_work FOREIGN KEY (work_id) REFERENCES volunteer_works (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed corals (same catalog as the in-memory Node storage)
INSERT INTO corals (id, name, image, description, price, stock) VALUES
(UUID(), 'Staghorn Coral', '/figmaAssets/adopt/coral-1.png', 'Fast-growing branching coral that builds the reef''s structural backbone.', 50, 25),
(UUID(), 'Brain Coral', '/figmaAssets/adopt/coral-2.png', 'Slow-growing dome coral known for its grooved, brain-like surface.', 75, 15),
(UUID(), 'Elkhorn Coral', '/figmaAssets/adopt/coral-3.png', 'Critically endangered shallow-water coral with broad, antler-like branches.', 90, 10);

INSERT INTO volunteer_works (id, title, description, location, scheduled_for, end_date, hours, status, category, max_volunteers) VALUES
(UUID(), 'Reef Cleanup Dive — Maui', 'Join certified divers to remove ghost nets and debris from a reef site off Maui''s southern coast.', 'Maui, Hawaii', DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 14 DAY) + INTERVAL 6 HOUR, 6, 'open', 'cleanup', 20),
(UUID(), 'Coral Nursery Maintenance', 'Help clean nursery trees, monitor growth, and prep coral fragments for outplanting.', 'Key Largo, Florida', DATE_ADD(NOW(), INTERVAL 21 DAY), NULL, 4, 'open', 'replanting', 15),
(UUID(), 'Beach Plastic Pickup', 'A morning shoreline cleanup focused on microplastics. Gloves and bags provided.', 'Santa Monica, California', DATE_ADD(NOW(), INTERVAL 7 DAY), NULL, 3, 'open', 'cleanup', 30),
(UUID(), 'Mangrove Replanting Day', 'Restore the coastal mangrove buffer that protects nearby reefs from runoff.', 'Tampa Bay, Florida', DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 31 DAY), 5, 'open', 'replanting', 25),
(UUID(), 'School Outreach Workshop', 'We taught 120 students about coral biology and reef-safe sunscreen.', 'San Diego, California', DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, 4, 'completed', 'outreach', NULL),
(UUID(), 'Reef Survey — Great Barrier', 'Volunteers logged bleaching observations across three reef sites.', 'Cairns, Australia', DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY), 8, 'completed', 'survey', NULL);
