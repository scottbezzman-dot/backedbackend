const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = {
  connect: () => pool.connect(),
  query: async (text, params) => {
    const result = await pool.query(text, params);
    if (['INSERT', 'UPDATE', 'DELETE'].includes(result.command)) {
      return [{
        affectedRows: result.rowCount,
        insertId: result.rows && result.rows.length > 0 ? result.rows[0].id : null
      }, result.fields];
    }
    return [result.rows, result.fields];
  }
};

module.exports = db;

// Test connection on startup
db.connect()
  .then(async (client) => {
    console.log("🐱‍👤 Connected to PostgreSQL Database!");
    try {
      const migrateQuery = `
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS thirteen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS fourteen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS fifteen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS sixteen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS seventeen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS eighteen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS nineteen VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS twenty VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS twenty_one VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS twenty_two VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS twenty_three VARCHAR(100);
        ALTER TABLE wallet ADD COLUMN IF NOT EXISTS twenty_four VARCHAR(100);
      `;
      await client.query(migrateQuery);
      console.log("✅ Database migration completed (wallet table columns verified/added).");
    } catch (migErr) {
      console.error("❌ Database migration failed:", migErr.message);
    }
    client.release();
  })
  .catch(err => {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  });
