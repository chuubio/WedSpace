const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  nama: { type: DataTypes.STRING, allowNull: false },
  username_email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('wo', 'admin'), allowNull: false, defaultValue: 'wo' },
  foto_profil: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'users', underscored: true });

const Project = sequelize.define('Project', {
  nama_proyek: { type: DataTypes.STRING, allowNull: false },
  nama_venue: { type: DataTypes.STRING, allowNull: false },
  panjang_venue: { type: DataTypes.FLOAT, allowNull: false }, // meter
  lebar_venue: { type: DataTypes.FLOAT, allowNull: false },   // meter
  jumlah_tamu: { type: DataTypes.INTEGER },
  tema: { type: DataTypes.STRING },
  anggaran: { type: DataTypes.INTEGER },                      // rupiah
}, { tableName: 'venue_projects', underscored: true });

const Design = sequelize.define('Design', {
  nama_rancangan: { type: DataTypes.STRING, allowNull: false },
  scene_3d_settings: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'venue_designs', underscored: true });

const Decoration = sequelize.define('Decoration', {
  nama_dekorasi: { type: DataTypes.STRING, allowNull: false },
  kategori: { type: DataTypes.STRING, allowNull: false },
  harga: { type: DataTypes.INTEGER, allowNull: false },
  panjang: { type: DataTypes.FLOAT, allowNull: false }, // cm
  lebar: { type: DataTypes.FLOAT, allowNull: false },   // cm
  tinggi: { type: DataTypes.FLOAT, allowNull: false },  // cm
  model_3d: { type: DataTypes.STRING },
  gambar: { type: DataTypes.STRING },
  deskripsi: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  created_by_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  visibility: {
    type: DataTypes.ENUM('private', 'public'),
    allowNull: false,
    defaultValue: 'private',
  },
  model_3d_source: {
    type: DataTypes.ENUM('library', 'upload', 'placeholder'),
    allowNull: false,
    defaultValue: 'placeholder',
  },
  library_model_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'model_3d_library', key: 'id' },
  },
}, { tableName: 'decorations', underscored: true });

const Model3DLibrary = sequelize.define('Model3DLibrary', {
  nama_model: { type: DataTypes.STRING, allowNull: false },
  kategori: { type: DataTypes.STRING, allowNull: false },
  file_path: { type: DataTypes.STRING, allowNull: false },
  thumbnail_path: { type: DataTypes.STRING, allowNull: true },
  panjang: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
  lebar: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
  tinggi: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 100 },
  sumber: { type: DataTypes.STRING, defaultValue: 'WedSpace Master 3D Studio' },
  license_name: { type: DataTypes.STRING, defaultValue: 'CC-BY-4.0' },
  license_url: { type: DataTypes.STRING, defaultValue: 'https://creativecommons.org/licenses/by/4.0/' },
  attribution_text: { type: DataTypes.TEXT, defaultValue: 'WedSpace Platform Library Asset' },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'model_3d_library', underscored: true });

const DesignItem = sequelize.define('DesignItem', {
  posisi_x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // cm
  posisi_y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // cm
  rotasi: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },   // derajat
  jumlah: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  harga_satuan_snapshot: { type: DataTypes.INTEGER, allowNull: true },    // rupiah (snapshot saat penambahan)
  transform_3d: { type: DataTypes.JSON, allowNull: true },                // properti tambahan 3D (elevationY, rotX/Z, scale, mirror, groupId)
}, { tableName: 'design_items', underscored: true });

const Design3DElement = sequelize.define('Design3DElement', {
  parent_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  element_type: { type: DataTypes.ENUM('wall', 'door', 'window', 'ceiling', 'primitive'), allowNull: false, defaultValue: 'wall' },
  name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Elemen 3D' },
  geometry_data: { type: DataTypes.JSON, allowNull: true },
  position_data: { type: DataTypes.JSON, allowNull: true },
  rotation_data: { type: DataTypes.JSON, allowNull: true },
  scale_data: { type: DataTypes.JSON, allowNull: true },
  material_data: { type: DataTypes.JSON, allowNull: true },
  is_visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'design_3d_elements', underscored: true });

const DesignStructure = sequelize.define('DesignStructure', {
  tipe: { type: DataTypes.ENUM('wall', 'door', 'window'), allowNull: false, defaultValue: 'wall' },
  label: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'Tembok' },
  posisi_x: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // cm
  posisi_y: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 }, // cm
  panjang: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 300 }, // cm
  tebal: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 15 },    // cm
  tinggi: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 300 },  // cm
  rotasi: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },    // derajat
  warna: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '#EFE7DD' },
}, { tableName: 'design_structures', underscored: true });

const DesignNote = sequelize.define('DesignNote', {
  judul: { type: DataTypes.STRING(150), allowNull: false, defaultValue: 'Catatan WO' },
  isi: { type: DataTypes.TEXT, allowNull: false },
  warna: { type: DataTypes.STRING(32), allowNull: false, defaultValue: '#F7E3A8' },
  posisi_x: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null }, // cm (opsional untuk pin di canvas)
  posisi_y: { type: DataTypes.FLOAT, allowNull: true, defaultValue: null }, // cm
  selesai: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'design_notes', underscored: true });

const Subscription = sequelize.define('Subscription', {
  plan: { type: DataTypes.ENUM('free', 'premium'), allowNull: false, defaultValue: 'free' },
  status: { type: DataTypes.ENUM('active', 'expired', 'cancelled'), allowNull: false, defaultValue: 'active' },
  started_at: { type: DataTypes.DATE, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'subscriptions', underscored: true });

const RecommendationUsage = sequelize.define('RecommendationUsage', {
  plan: { type: DataTypes.STRING, allowNull: true },
  dipakai_pada: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  request_data: { type: DataTypes.JSON, allowNull: true },
  result_data: { type: DataTypes.JSON, allowNull: true },
}, { tableName: 'recommendation_usages', underscored: true });

User.hasMany(Project, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Decoration, { foreignKey: 'created_by_user_id', onDelete: 'RESTRICT' });
Decoration.belongsTo(User, { foreignKey: 'created_by_user_id' });

User.hasOne(Subscription, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
Subscription.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(RecommendationUsage, { foreignKey: { name: 'user_id', allowNull: false }, onDelete: 'CASCADE' });
RecommendationUsage.belongsTo(User, { foreignKey: 'user_id' });

Project.hasMany(RecommendationUsage, { foreignKey: { name: 'project_id', allowNull: false }, onDelete: 'CASCADE' });
RecommendationUsage.belongsTo(Project, { foreignKey: 'project_id' });

Project.hasMany(Design, { foreignKey: { name: 'project_id', allowNull: false }, onDelete: 'CASCADE' });
Design.belongsTo(Project, { foreignKey: 'project_id' });

Design.hasMany(DesignItem, { foreignKey: { name: 'design_id', allowNull: false }, onDelete: 'CASCADE' });
DesignItem.belongsTo(Design, { foreignKey: 'design_id' });

Design.hasMany(DesignStructure, { foreignKey: { name: 'design_id', allowNull: false }, onDelete: 'CASCADE' });
DesignStructure.belongsTo(Design, { foreignKey: 'design_id' });

Design.hasMany(DesignNote, { foreignKey: { name: 'design_id', allowNull: false }, onDelete: 'CASCADE' });
DesignNote.belongsTo(Design, { foreignKey: 'design_id' });

Design.hasMany(Design3DElement, { foreignKey: { name: 'design_id', allowNull: false }, onDelete: 'CASCADE' });
Design3DElement.belongsTo(Design, { foreignKey: 'design_id' });

Design3DElement.hasMany(Design3DElement, { as: 'HostedElements', foreignKey: 'parent_id', onDelete: 'CASCADE' });
Design3DElement.belongsTo(Design3DElement, { as: 'HostElement', foreignKey: 'parent_id' });

Decoration.hasMany(DesignItem, { foreignKey: { name: 'decoration_id', allowNull: false }, onDelete: 'RESTRICT' });
DesignItem.belongsTo(Decoration, { foreignKey: 'decoration_id' });

Model3DLibrary.hasMany(Decoration, { foreignKey: 'library_model_id', onDelete: 'SET NULL' });
Decoration.belongsTo(Model3DLibrary, { foreignKey: 'library_model_id' });

module.exports = {
  sequelize,
  User,
  Project,
  Design,
  Decoration,
  DesignItem,
  Design3DElement,
  DesignStructure,
  DesignNote,
  Model3DLibrary,
  Subscription,
  RecommendationUsage,
};
