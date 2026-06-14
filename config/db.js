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
  .then(client => {
    console.log("🐱‍👤 Connected to PostgreSQL Database!");
    client.release();
  })
  .catch(err => {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1);
  });
