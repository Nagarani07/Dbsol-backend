import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { sql, poolPromise } from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/login", async (req, res) => {
  const { empId, password } = req.body;

  if (!empId || !password) {
    return res.status(400).json({ success: false, message: "Employee/Admin ID and password are required" });
  }

  try {
    const pool = await poolPromise;
    const isEmployee = empId.startsWith("EMP");
    const query = isEmployee
      ? `
        SELECT 'EMPLOYEE' AS role, *
        FROM EMPLOYEE1
        WHERE EmpId = @empId AND Password = @password
      `
      : `
        SELECT 'ADMIN' AS role, *
        FROM ADMIN1
        WHERE AdminId = @empId AND Password = @password
      `;

    const result = await pool.request()
      .input("empId", sql.VarChar, empId)
      .input("password", sql.VarChar, password)
      .query(query);

    if (result.recordset.length > 0) {
      return res.json({ success: true, user: result.recordset[0] });
    }

    return res.status(401).json({ success: false, message: "Invalid ID or Password" });
  } catch (err) {
    console.error("Login API failed:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/apply-leave", async (req, res) => {
  const { empId, fromDate, toDate, reason } = req.body;

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("empId", sql.VarChar, empId)
      .input("fromDate", sql.Date, fromDate)
      .input("toDate", sql.Date, toDate)
      .input("reason", sql.VarChar, reason)
      .query(`
        INSERT INTO LeaveRequests (EmpId, FromDate, ToDate, Reason)
        VALUES (@empId, @fromDate, @toDate, @reason)
      `);

    return res.json({ message: "Leave applied successfully" });
  } catch (err) {
    console.error("Apply leave API failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend is running",
    timestamp: new Date(),
  });
});

const PORT = Number(process.env.SERVER_PORT || 5000);
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
