import dotenv from "dotenv";
import sql from "mssql";

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || "localhost",
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
