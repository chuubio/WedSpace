/**
 * Migration 002: Add harga_satuan_snapshot to design_items table
 * Includes safe column addition, backfill from decorations.harga, and rollback support.
 */

async function up(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;
  const [columns] = await sequelize.query('DESCRIBE design_items');
  const existingCols = columns.map((c) => c.Field);

  // 1. Add harga_satuan_snapshot column if not exists
  if (!existingCols.includes('harga_satuan_snapshot')) {
    await queryInterface.addColumn('design_items', 'harga_satuan_snapshot', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
    console.log('[Migration 002] Column harga_satuan_snapshot added to design_items.');
  }

  // 2. Backfill existing items with current decoration price
  const [result] = await sequelize.query(`
    UPDATE design_items di
    INNER JOIN decorations d ON di.decoration_id = d.id
    SET di.harga_satuan_snapshot = d.harga
    WHERE di.harga_satuan_snapshot IS NULL
  `);
  console.log(`[Migration 002] Backfill completed. Rows updated: ${result?.affectedRows ?? 0}`);
}

async function down(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;
  const [columns] = await sequelize.query('DESCRIBE design_items');
  const existingCols = columns.map((c) => c.Field);

  if (existingCols.includes('harga_satuan_snapshot')) {
    await queryInterface.removeColumn('design_items', 'harga_satuan_snapshot');
    console.log('[Migration 002] Column harga_satuan_snapshot removed from design_items.');
  }
}

module.exports = { up, down };
