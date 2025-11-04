export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'clave-secreta-desarrollo',
  expiresIn: '24h'
};