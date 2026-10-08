import dotenv from 'dotenv'
dotenv.config()

// Prefijo DB_ a proposito: USER y HOST ya existen en el entorno del sistema operativo
// y dotenv no los pisa, asi que la conexion terminaba usando el usuario del SO.
export const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

export const schemaConfig = {
  schemaOrigen: process.env.SCHEMA_ORIGEN || 'negocio',
  schemaRendimiento: process.env.SCHEMA_RENDIMIENTO || 'fce_per',
};
