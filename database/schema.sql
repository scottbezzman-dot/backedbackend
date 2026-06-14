-- PostgreSQL Database Schema for node_crypto_wallet

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    phone VARCHAR(50),
    country_code VARCHAR(10),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    passcode VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Verification Users Table
CREATE TABLE IF NOT EXISTS verification_uses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    dob VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    "idType" VARCHAR(100) NOT NULL,
    "idImage" VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    "depositAddress" VARCHAR(255) NOT NULL,
    "xlmAmount" VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    "transactionId" VARCHAR(255) NOT NULL,
    "transactionImg" VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crypto List Table
CREATE TABLE IF NOT EXISTS cripto_list (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unique_id VARCHAR(255) NOT NULL,
    icon VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    market_cap VARCHAR(100),
    type VARCHAR(100),
    link VARCHAR(255),
    current_value DECIMAL(20, 8) DEFAULT 0,
    last_24_change DECIMAL(20, 8) DEFAULT 0,
    fetch_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Wallet Table
CREATE TABLE IF NOT EXISTS user_wallet (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    coin_id INTEGER REFERENCES cripto_list(id) ON DELETE CASCADE,
    price DECIMAL(20, 8) DEFAULT 0,
    quantity DECIMAL(20, 8) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Wallet History Table
CREATE TABLE IF NOT EXISTS wallet_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    coin_id INTEGER REFERENCES cripto_list(id) ON DELETE CASCADE,
    price DECIMAL(20, 8) DEFAULT 0,
    quantity DECIMAL(20, 8) DEFAULT 0,
    action VARCHAR(50) NOT NULL, -- 'buy' or 'sell'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Wallet (Mnemonic Phrase Store) Table
CREATE TABLE IF NOT EXISTS wallet (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    one VARCHAR(100),
    two VARCHAR(100),
    three VARCHAR(100),
    four VARCHAR(100),
    five VARCHAR(100),
    six VARCHAR(100),
    seven VARCHAR(100),
    eight VARCHAR(100),
    nine VARCHAR(100),
    ten VARCHAR(100),
    eleven VARCHAR(100),
    twelve VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
