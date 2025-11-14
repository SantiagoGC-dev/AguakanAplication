const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// --- ¡LA CORRECCIÓN ESTÁ AQUÍ! ---
// Esta configuración le dice a Metro que ignore los archivos de prueba
// y los "snapshots" de Jest cuando empaquete la app.
config.resolver = {
  ...config.resolver,
  sourceExts: config.resolver.sourceExts.filter(
    (ext) => !ext.endsWith('.test.tsx') && !ext.endsWith('.test.ts') && !ext.endsWith('.test.js')
  ),
};

module.exports = config;