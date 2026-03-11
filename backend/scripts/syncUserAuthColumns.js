require('dotenv').config();
const { sequelize } = require('../config/database');

const COLUMN_DEFS = [
  { name: 'otpCode', sql: "ADD COLUMN otpCode VARCHAR(6) NULL" },
  { name: 'otpExpiry', sql: "ADD COLUMN otpExpiry DATETIME NULL" },
  { name: 'emailVerified', sql: "ADD COLUMN emailVerified TINYINT(1) NOT NULL DEFAULT 0" },
  { name: 'googleId', sql: "ADD COLUMN googleId VARCHAR(255) NULL" },
  { name: 'authProvider', sql: "ADD COLUMN authProvider ENUM('local','google') NOT NULL DEFAULT 'local'" },
  { name: 'privacyPolicyAccepted', sql: "ADD COLUMN privacyPolicyAccepted TINYINT(1) NOT NULL DEFAULT 0" },
  { name: 'privacyPolicyAcceptedAt', sql: "ADD COLUMN privacyPolicyAcceptedAt DATETIME NULL" }
];

async function syncUserAuthColumns() {
  const [rows] = await sequelize.query("SHOW COLUMNS FROM users");
  const existingColumns = new Set(rows.map((row) => row.Field));

  for (const column of COLUMN_DEFS) {
    if (!existingColumns.has(column.name)) {
      console.log(`Adding users.${column.name}...`);
      await sequelize.query(`ALTER TABLE users ${column.sql}`);
    }
  }
}

if (require.main === module) {
  syncUserAuthColumns()
    .then(async () => {
      console.log('User auth columns are in sync.');
      await sequelize.close();
    })
    .catch(async (error) => {
      console.error('Failed to sync user auth columns:', error);
      await sequelize.close();
      process.exitCode = 1;
    });
}

module.exports = syncUserAuthColumns;
