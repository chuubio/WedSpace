/**
 * Migration 001: Add created_by_user_id and visibility to decorations table
 * Includes indexes, foreign key constraint, backfill for existing platform assets, and rollback support.
 */

async function up(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;
  const [columns] = await sequelize.query('DESCRIBE decorations');
  const existingCols = columns.map((c) => c.Field);

  // 1. Add created_by_user_id column if not exists
  if (!existingCols.includes('created_by_user_id')) {
    await queryInterface.addColumn('decorations', 'created_by_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    console.log('[Migration 001] Column created_by_user_id added.');
  }

  // 2. Add visibility column if not exists
  if (!existingCols.includes('visibility')) {
    await queryInterface.addColumn('decorations', 'visibility', {
      type: Sequelize.ENUM('private', 'public'),
      allowNull: false,
      defaultValue: 'private',
    });
    console.log('[Migration 001] Column visibility added.');
  }

  // 3. Add Indexes if not exist
  const [indexes] = await sequelize.query('SHOW INDEX FROM decorations');
  const indexNames = indexes.map((i) => i.Key_name);

  if (!indexNames.includes('idx_decorations_created_by_user_id')) {
    await queryInterface.addIndex('decorations', ['created_by_user_id'], {
      name: 'idx_decorations_created_by_user_id',
    });
    console.log('[Migration 001] Index idx_decorations_created_by_user_id added.');
  }

  if (!indexNames.includes('idx_decorations_visibility')) {
    await queryInterface.addIndex('decorations', ['visibility'], {
      name: 'idx_decorations_visibility',
    });
    console.log('[Migration 001] Index idx_decorations_visibility added.');
  }

  if (!indexNames.includes('idx_decorations_active_visibility')) {
    await queryInterface.addIndex('decorations', ['is_active', 'visibility'], {
      name: 'idx_decorations_active_visibility',
    });
    console.log('[Migration 001] Index idx_decorations_active_visibility added.');
  }

  // 4. Backfill data lama: semua dekorasi awal yang belum memiliki pemilik dijadikan aset platform publik
  const [result] = await sequelize.query(`
    UPDATE decorations 
    SET created_by_user_id = NULL, visibility = 'public' 
    WHERE created_by_user_id IS NULL AND (visibility IS NULL OR visibility = 'private')
  `);
  console.log(`[Migration 001] Backfill completed. Rows updated: ${result?.affectedRows ?? 0}`);
}

async function down(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;
  const [columns] = await sequelize.query('DESCRIBE decorations');
  const existingCols = columns.map((c) => c.Field);

  // 1. Remove Foreign Key on created_by_user_id FIRST (required before dropping index in MySQL)
  const [fks] = await sequelize.query(`
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'decorations' 
      AND COLUMN_NAME = 'created_by_user_id' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);
  for (const fk of fks) {
    await queryInterface.removeConstraint('decorations', fk.CONSTRAINT_NAME);
    console.log(`[Migration 001] Constraint ${fk.CONSTRAINT_NAME} removed.`);
  }

  // 2. Remove Indexes
  const [indexes] = await sequelize.query('SHOW INDEX FROM decorations');
  const indexNames = indexes.map((i) => i.Key_name);

  if (indexNames.includes('idx_decorations_active_visibility')) {
    await queryInterface.removeIndex('decorations', 'idx_decorations_active_visibility');
    console.log('[Migration 001] Index idx_decorations_active_visibility removed.');
  }

  if (indexNames.includes('idx_decorations_visibility')) {
    await queryInterface.removeIndex('decorations', 'idx_decorations_visibility');
    console.log('[Migration 001] Index idx_decorations_visibility removed.');
  }

  if (indexNames.includes('idx_decorations_created_by_user_id')) {
    await queryInterface.removeIndex('decorations', 'idx_decorations_created_by_user_id');
    console.log('[Migration 001] Index idx_decorations_created_by_user_id removed.');
  }

  // 3. Remove columns
  if (existingCols.includes('visibility')) {
    await queryInterface.removeColumn('decorations', 'visibility');
    console.log('[Migration 001] Column visibility removed.');
  }

  if (existingCols.includes('created_by_user_id')) {
    await queryInterface.removeColumn('decorations', 'created_by_user_id');
    console.log('[Migration 001] Column created_by_user_id removed.');
  }
}

module.exports = { up, down };
