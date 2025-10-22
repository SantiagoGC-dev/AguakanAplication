import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "localhost",   // tu host
  user: "root",        // tu usuario
  password: "Nacho123",        // tu contraseña
  database: "AguakanPP", // tu base de datos
  port: 3306           // o el que uses
});

export default pool;
