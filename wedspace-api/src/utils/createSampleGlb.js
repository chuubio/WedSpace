const fs = require('node:fs');
const path = require('node:path');

function createMinimalGlb(nodeName = 'SampleNode') {
  const gltf = {
    asset: { version: '2.0', generator: 'WedSpace-Sample-Generator' },
    scenes: [{ nodes: [0] }],
    nodes: [{ name: nodeName }],
    scene: 0,
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  // Padding to 4-byte boundary
  const remainder = jsonBuf.length % 4;
  const paddingSize = remainder === 0 ? 0 : 4 - remainder;
  const paddingBuf = Buffer.alloc(paddingSize, 0x20); // space padding

  const chunkLength = jsonBuf.length + paddingSize;
  const totalLength = 12 + 8 + chunkLength;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // "glTF"
  header.writeUInt32LE(2, 4); // version 2
  header.writeUInt32LE(totalLength, 8); // total file length

  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(chunkLength, 0);
  chunkHeader.writeUInt32LE(0x4E4F534A, 4); // "JSON"

  return Buffer.concat([header, chunkHeader, jsonBuf, paddingBuf]);
}

function ensureSampleGlbFiles() {
  const libraryDir = path.join(__dirname, '..', '..', 'uploads', 'library');
  fs.mkdirSync(libraryDir, { recursive: true });

  const files = [
    { name: 'meja_bundar.glb', node: 'MejaBundar' },
    { name: 'kursi_tiffany.glb', node: 'KursiTiffany' },
    { name: 'wedding_arch.glb', node: 'WeddingArch' },
  ];

  for (const f of files) {
    const fullPath = path.join(libraryDir, f.name);
    if (!fs.existsSync(fullPath)) {
      const glb = createMinimalGlb(f.node);
      fs.writeFileSync(fullPath, glb);
      console.log(`Created sample library GLB: ${f.name}`);
    }
  }
}

module.exports = { createMinimalGlb, ensureSampleGlbFiles };

if (require.main === module) {
  ensureSampleGlbFiles();
}
