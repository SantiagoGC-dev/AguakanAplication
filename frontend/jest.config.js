// jest.config.js
module.exports = {
  preset: "jest-expo",
  // Añade esto para que Jest entienda tus alias de importación (ej: @/utils/api)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};