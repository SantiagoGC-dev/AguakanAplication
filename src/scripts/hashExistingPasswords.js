import { hashPassword } from '../utils/passwordUtils.js';
import pool from '../config/db.js';

async function migratePasswords() {
  try {
    console.log('🔐 Iniciando migración de passwords...');
    
    const [usuarios] = await pool.execute(`
      SELECT id_usuario, correo, password 
      FROM usuario 
      WHERE password IS NOT NULL
    `);
    
    console.log(`📊 Usuarios encontrados: ${usuarios.length}`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const usuario of usuarios) {
      if (usuario.password && !usuario.password.startsWith('$2a$')) {
        const hashedPassword = await hashPassword(usuario.password);
        
        await pool.execute(
          'UPDATE usuario SET password = ? WHERE id_usuario = ?',
          [hashedPassword, usuario.id_usuario]
        );
        
        updatedCount++;
        console.log(`✅ Password actualizado para: ${usuario.correo}`);
      } else {
        skippedCount++;
        console.log(`⏭️  Password ya hasheado: ${usuario.correo}`);
      }
    }
    
    console.log(`🎉 Migración completada:`);
    console.log(`   - ✅ Actualizados: ${updatedCount}`);
    console.log(`   - ⏭️  Saltados: ${skippedCount}`);
    console.log(`   - 📊 Total: ${usuarios.length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

migratePasswords();