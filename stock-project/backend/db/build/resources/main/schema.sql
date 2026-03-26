-- ============================================================
-- StockIndex 프로젝트 초기 스키마
-- MySQL 8.x 이상 필요
-- ============================================================

CREATE DATABASE IF NOT EXISTS stock_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stock_db;

-- 사용자
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  email         VARCHAR(100) NOT NULL UNIQUE,
  name          VARCHAR(50)  NOT NULL,
  profile_image VARCHAR(500),
  provider      VARCHAR(10)  NOT NULL COMMENT 'GOOGLE | NAVER',
  provider_id   VARCHAR(100) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_provider (provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 포트폴리오
CREATE TABLE IF NOT EXISTS portfolios (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(200),
  is_public   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  CONSTRAINT fk_portfolio_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 포트폴리오 종목
CREATE TABLE IF NOT EXISTS portfolio_items (
  id            BIGINT         NOT NULL AUTO_INCREMENT,
  portfolio_id  BIGINT         NOT NULL,
  ticker        VARCHAR(20)    NOT NULL,
  stock_name    VARCHAR(100)   NOT NULL,
  quantity      INT            NOT NULL,
  avg_buy_price DECIMAL(15,4)  NOT NULL,
  purchase_date DATE,
  weight        DECIMAL(5,2),
  PRIMARY KEY (id),
  KEY idx_portfolio (portfolio_id),
  CONSTRAINT fk_item_portfolio FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 커스텀 지수
CREATE TABLE IF NOT EXISTS custom_indexes (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  user_id     BIGINT       NOT NULL,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(300),
  is_public   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  CONSTRAINT fk_index_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 지수 구성 지표
CREATE TABLE IF NOT EXISTS index_components (
  id               BIGINT         NOT NULL AUTO_INCREMENT,
  custom_index_id  BIGINT         NOT NULL,
  indicator_type   VARCHAR(20)    NOT NULL,
  indicator_name   VARCHAR(50)    NOT NULL,
  weight           DECIMAL(5,2)   NOT NULL,
  direction        TINYINT        NOT NULL DEFAULT 1 COMMENT '1=양의상관, -1=음의상관',
  description      VARCHAR(200),
  data_source_code VARCHAR(100),
  PRIMARY KEY (id),
  KEY idx_custom_index (custom_index_id),
  CONSTRAINT fk_component_index FOREIGN KEY (custom_index_id) REFERENCES custom_indexes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 태그
CREATE TABLE IF NOT EXISTS tag (
  id          BIGINT      NOT NULL AUTO_INCREMENT,
  name        VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(100),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
