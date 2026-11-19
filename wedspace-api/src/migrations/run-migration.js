require('dotenv').config();
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const migration001 = require('./001_add_owner_and_visibility_to_decorations');

const migrations = [
  { name: '001_add_owner_and_visibility_to_decorations', module: migration001 },
];

async function ensureMetaTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS sequelize_meta (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
}

async function run() {
  const isDown = process.argv.includes('--down') || process.argv.includes('down');
  const queryInterface = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    await ensureMetaTable();

    const [rows] = await sequelize.query('SELECT name FROM sequelize_meta ORDER BY executed_at ASC');
    const executed = rows.map((r) => r.name);

    if (isDown) {
      console.log('--- Running Migration Rollback (DOWN) ---');
      const toRollback = [...migrations].reverse().filter((m) => executed.includes(m.name));
      if (toRollback.length === 0) {
        console.log('Tidak ada migration yang perlu di-rollback.');
        return;
      }
      for (const m of toRollback) {
        console.log(`Rollback migration: ${m.name}`);
        await m.module.down(queryInterface, Sequelize);
        await sequelize.query('DELETE FROM sequelize_meta WHERE name = ?', { replacements: [m.name] });
        console.log(`Rollback ${m.name} berhasil.`);
      }
    } else {
      console.log('--- Running Migration (UP) ---');
      const pending = migrations.filter((m) => !executed.includes(m.name));
      if (pending.length === 0) {
        console.log('Semua migration sudah dijalankan.');
        return;
      }
      for (const m of pending) {
        console.log(`Menjalankan migration: ${m.name}`);
        await m.module.up(queryInterface, Sequelize);
        await sequelize.query('INSERT INTO sequelize_meta (name, executed_at) VALUES (?, NOW())', {
          replacements: [m.name],
        });
        console.log(`Migration ${m.name} berhasil.`);
      }
    }
  } catch (err) {
    console.error('Migration error:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
