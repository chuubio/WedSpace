/**
 * Migration 005: Workspace 3D Scene Storage
 * 1. Create `design_3d_elements` table (walls, doors, windows, ceiling, primitives) with parent_id host relation
 * 2. Add `scene_3d_settings` JSON column to `venue_designs` (floor material, lighting, quality)
 * 3. Add `transform_3d` JSON column to `design_items` (elevationY, rotX/Z, scale, mirror, visibility, lock, groupId)
 */

async function up(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS design_3d_elements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      design_id INT NOT NULL,
      parent_id INT NULL DEFAULT NULL,
      element_type ENUM('wall', 'door', 'window', 'ceiling', 'primitive') NOT NULL DEFAULT 'wall',
      name VARCHAR(120) NOT NULL DEFAULT 'Elemen 3D',
      geometry_data JSON NULL,
      position_data JSON NULL,
      rotation_data JSON NULL,
      scale_data JSON NULL,
      material_data JSON NULL,
      is_visible TINYINT(1) NOT NULL DEFAULT 1,
      is_locked TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_design_3d_elements_design
        FOREIGN KEY (design_id) REFERENCES venue_designs(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_design_3d_elements_parent
        FOREIGN KEY (parent_id) REFERENCES design_3d_elements(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
  console.log('[Migration 005] Table design_3d_elements ready.');

  const [elCols] = await sequelize.query('DESCRIBE design_3d_elements');
  if (!elCols.some((c) => c.Field === 'design_id')) {
    await queryInterface.addColumn('design_3d_elements', 'design_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'venue_designs', key: 'id' },
      onDelete: 'CASCADE',
    });
    console.log('[Migration 005] Column design_id added to design_3d_elements.');
  }

  const [designCols] = await sequelize.query('DESCRIBE venue_designs');
  if (!designCols.some((c) => c.Field === 'scene_3d_settings')) {
    await queryInterface.addColumn('venue_designs', 'scene_3d_settings', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
    });
    console.log('[Migration 005] Column scene_3d_settings added to venue_designs.');
  }

  const [itemCols] = await sequelize.query('DESCRIBE design_items');
  if (!itemCols.some((c) => c.Field === 'transform_3d')) {
    await queryInterface.addColumn('design_items', 'transform_3d', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
    });
    console.log('[Migration 005] Column transform_3d added to design_items.');
  }
}

async function down(queryInterface) {
  const { sequelize } = queryInterface;

  const [itemCols] = await sequelize.query('DESCRIBE design_items');
  if (itemCols.some((c) => c.Field === 'transform_3d')) {
    await queryInterface.removeColumn('design_items', 'transform_3d');
  }

  const [designCols] = await sequelize.query('DESCRIBE venue_designs');
  if (designCols.some((c) => c.Field === 'scene_3d_settings')) {
    await queryInterface.removeColumn('venue_designs', 'scene_3d_settings');
  }

  await sequelize.query('DROP TABLE IF EXISTS design_3d_elements;');
  console.log('[Migration 005] Rolled back Workspace 3D schema.');
}

module.exports = { up, down };
