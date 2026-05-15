import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const requiredEnv = ["DB_SERVER", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required database environment variables: ${missingEnv.join(", ")}`);
}

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("SQL Server connected");
    return pool;
  })
  .catch(err => {
    console.error("SQL Server connection failed:", err.message);
    throw err;
  });

export { sql, poolPromise };
