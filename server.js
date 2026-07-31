import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { sql, poolPromise } from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// LOGIN API
// ======================
app.post("/api/login", async (req, res) => {
  const { empId, password } = req.body;

  if (!empId || !password) {
    return res.status(400).json({
      success: false,
      message: "Employee ID and Password are required",
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("empId", sql.Int, Number(empId))
      .query(`
        SELECT
          EmpID,
          Name,
          Email,
          Role,
          Status,
          IsAdmin,
          Password
        FROM Employee
        WHERE EmpID = @empId
      `);

    // ✅ Check if user exists
    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid employee or password",
      });
    }

    const user = result.recordset[0];

    // ✅ Compare password manually
    if (user.Password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid employee or password",
      });
    }

    // ✅ Send response
    res.json({
      success: true,
      user: {
        empId: user.EmpID,
        name: user.Name,
        isAdmin: user.IsAdmin,
      },
    });

  } catch (err) {
    console.error("Login API Error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
  
app.get("/api/employees", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .query("SELECT * FROM Employee");

    res.json(result.recordset);
  } catch (err) {
    console.error("Employees API Error:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});
// ======================
// GET ALL EMPLOYEES
// ======================

app.get("/api/leave-requests", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .query(`
        SELECT
    e.EmpID,
    e.Name,
    e.Email,
    e.Role,
    l.RequestType,
    l.LeaveType,
    l.FromDate,
    l.ToDate,
    l.Days,
    l.Reason,
    l.Status,
    l.AppliedDate
FROM Employee AS e
INNER JOIN LeaveRequests AS l
ON e.EmpID = l.EmpID;
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Leave Requests API Error:", err);
    res.status(500).json({
      error: err.message,
    });
  }
});

app.patch("/api/leave-requests/:leaveId/status", async (req, res) => {
  const leaveId = Number(req.params.leaveId);
  const { status } = req.body;
  const allowedStatuses = ["Approved", "Rejected"];

  if (!Number.isInteger(leaveId)) {
    return res.status(400).json({
      success: false,
      message: "Valid leave request ID is required",
    });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be Approved or Rejected",
    });
  }

  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("leaveId", sql.Int, leaveId)
      .input("status", sql.VarChar(20), status)
      .query(`
        UPDATE LeaveRequests
        SET Status = @status
        WHERE LeaveID = @leaveId
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    res.json({
      success: true,
      message: "Leave status updated successfully",
      leaveId,
      status,
    });
  } catch (err) {
    console.error("Update Leave Status API Error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ======================
// APPLY LEAVE
// ======================
app.post("/api/apply-leave", async (req, res) => {
  const {
    empId,
    requestType,
    leaveType,
    fromDate,
    toDate,
    days,
    reason,
  } = req.body;

  try {
    const pool = await poolPromise;

    await pool
      .request()
      .input("empId", sql.Int, Number(empId))
      .input("requestType", sql.VarChar(50), requestType)
      .input("leaveType", sql.VarChar(50), leaveType || null)
      .input("fromDate", sql.Date, fromDate)
      .input("toDate", sql.Date, toDate)
      .input("days", sql.Int, Number(days))
      .input("reason", sql.VarChar(sql.MAX), reason)
      .query(`
        INSERT INTO LeaveRequests
        (
          EmpId,
          RequestType,
          LeaveType,
          FromDate,
          ToDate,
          Days,
          Reason
        )
        VALUES
        (
          @empId,
          @requestType,
          @leaveType,
          @fromDate,
          @toDate,
          @days,
          @reason
        )
      `);

    res.json({
      success: true,
      message: "Request submitted successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ======================
// HEALTH CHECK
// ======================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend running successfully",
    timestamp: new Date(),
  });
});

// ======================
// SERVER START
// ======================
const PORT = Number(process.env.SERVER_PORT || 5000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
