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
}, { tableName: 'design_items', underscored: true });

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
  Model3DLibrary,
  Subscription,
  RecommendationUsage,
};
