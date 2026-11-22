/**
 * Migration 003: Create model_3d_library table and update decorations table
 * Includes table creation, decoration column additions (model_3d_source, library_model_id),
 * initial master library seed data, and rollback support.
 */

async function up(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;

  // 1. Create model_3d_library table if not exists
  const [tables] = await sequelize.query("SHOW TABLES LIKE 'model_3d_library'");
  if (tables.length === 0) {
    await queryInterface.createTable('model_3d_library', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nama_model: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      kategori: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      file_path: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      thumbnail_path: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      panjang: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 100,
      },
      lebar: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 100,
      },
      tinggi: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 100,
      },
      sumber: {
        type: Sequelize.STRING(255),
        defaultValue: 'WedSpace Master Library',
      },
      license_name: {
        type: Sequelize.STRING(100),
        defaultValue: 'CC-BY-4.0',
      },
      license_url: {
        type: Sequelize.STRING(255),
        defaultValue: 'https://creativecommons.org/licenses/by/4.0/',
      },
      attribution_text: {
        type: Sequelize.TEXT,
        defaultValue: 'WedSpace Platform Library Asset',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    console.log('[Migration 003] Table model_3d_library created.');

    // Seed sample platform library assets
    await queryInterface.bulkInsert('model_3d_library', [
      {
        nama_model: 'Meja Bundar Perjamuan 10 Orang',
        kategori: 'Meja',
        file_path: '/uploads/library/meja_bundar.glb',
        thumbnail_path: null,
        panjang: 180,
        lebar: 180,
        tinggi: 75,
        sumber: 'WedSpace Master 3D Studio',
        license_name: 'CC-BY-4.0',
        license_url: 'https://creativecommons.org/licenses/by/4.0/',
        attribution_text: 'Aset master 3D platform WedSpace untuk tata meja perjamuan',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        nama_model: 'Kursi Tiffany Putih Klasik',
        kategori: 'Kursi',
        file_path: '/uploads/library/kursi_tiffany.glb',
        thumbnail_path: null,
        panjang: 45,
        lebar: 45,
        tinggi: 90,
        sumber: 'WedSpace Master 3D Studio',
        license_name: 'CC-BY-4.0',
        license_url: 'https://creativecommons.org/licenses/by/4.0/',
        attribution_text: 'Aset master 3D platform WedSpace untuk kursi resepsi',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        nama_model: 'Floral Wedding Arch Modern',
        kategori: 'Pelaminan',
        file_path: '/uploads/library/wedding_arch.glb',
        thumbnail_path: null,
        panjang: 240,
        lebar: 80,
        tinggi: 260,
        sumber: 'WedSpace Master 3D Studio',
        license_name: 'CC-BY-4.0',
        license_url: 'https://creativecommons.org/licenses/by/4.0/',
        attribution_text: 'Aset master 3D platform WedSpace untuk gerbang lengkung bunga',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
    console.log('[Migration 003] Sample 3D library assets seeded.');
  }

  // 2. Add columns to decorations table if not exists
  const [columns] = await sequelize.query('DESCRIBE decorations');
  const existingCols = columns.map((c) => c.Field);

  if (!existingCols.includes('model_3d_source')) {
    await queryInterface.addColumn('decorations', 'model_3d_source', {
      type: Sequelize.ENUM('library', 'upload', 'placeholder'),
      allowNull: false,
      defaultValue: 'placeholder',
    });
    console.log('[Migration 003] Column model_3d_source added to decorations.');
  }

  if (!existingCols.includes('library_model_id')) {
    await queryInterface.addColumn('decorations', 'library_model_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'model_3d_library',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    console.log('[Migration 003] Column library_model_id added to decorations.');
  }

  // 3. Backfill decorations: jika model_3d ada isinya, set 'upload', selain itu 'placeholder'
  await sequelize.query(`
    UPDATE decorations
    SET model_3d_source = CASE 
      WHEN model_3d IS NOT NULL AND TRIM(model_3d) != '' THEN 'upload'
      ELSE 'placeholder'
    END
    WHERE model_3d_source IS NULL OR model_3d_source = 'placeholder'
  `);
  console.log('[Migration 003] Backfilled decorations.model_3d_source.');
}

async function down(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;
  const [columns] = await sequelize.query('DESCRIBE decorations');
  const existingCols = columns.map((c) => c.Field);

  if (existingCols.includes('library_model_id')) {
    await queryInterface.removeColumn('decorations', 'library_model_id');
    console.log('[Migration 003] Column library_model_id removed from decorations.');
  }

  if (existingCols.includes('model_3d_source')) {
    await queryInterface.removeColumn('decorations', 'model_3d_source');
    console.log('[Migration 003] Column model_3d_source removed from decorations.');
  }

  const [tables] = await sequelize.query("SHOW TABLES LIKE 'model_3d_library'");
  if (tables.length > 0) {
    await queryInterface.dropTable('model_3d_library');
    console.log('[Migration 003] Table model_3d_library dropped.');
  }
}

module.exports = { up, down };
