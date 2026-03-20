const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");
const { AppError } = require("../Logics/AppError");

/* ===============================
   Create Project
=================================*/
exports.createProject = async (data, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const query = `
      INSERT INTO project_list
      (tenant_id, branch_id,
      Project_name, Project_type, Project_cost, Margin,
      Project_Estimation_Cost, Project_start_date,
      Estimated_end_date, Site_location,
      Project_status, Contractor, Site_supervisor,
      Photo, Created_by, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const result = await conn.query(query, [
      tenant_id,
      branch_id,
      data.Project_name,
      data.Project_type,
      data.Project_cost,
      data.Margin,
      data.Project_Estimation_Cost,
      data.Project_start_date,
      data.Estimated_end_date,
      data.Site_location,
      data.ProjectStatus,
      data.Contractor,
      data.Site_supervisor,
      data.Photo || null,
      data.Username,
    ]);
    return {
      success: true,
      message: "Project created successfully",
      insertId: result.insertId,
    };
  } catch (error) {
    console.error("❌ createProject Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Project already exists", 409, error);
    }
    throw new AppError("Failed to create project", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Update Project
=================================*/
exports.updateProject = async (data, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `UPDATE project_list
      SET Project_name=?, Project_type=?, Project_cost=?, Margin=?,
      Project_Estimation_Cost=?, Project_start_date=?,
      Estimated_end_date=?, Site_location=?, Contractor=?,
      Site_supervisor=?, Photo=?, Project_status=?
      WHERE Project_id=? AND tenant_id=? AND branch_id=?`,
      [
        data.Project_name,
        data.Project_type,
        data.Project_cost,
        data.Margin,
        data.Project_Estimation_Cost,
        data.Project_start_date,
        data.Estimated_end_date,
        data.Site_location,
        data.Contractor,
        data.Site_supervisor,
        data.Photo,
        data.Project_status,
        data.Project_id,
        tenant_id,
        branch_id,
      ]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Project not found or access denied", 404);
    }
    return { success: true, message: "Project updated successfully" };
  } catch (error) {
    console.error("❌ updateProject Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Project name already exists", 409, error);
    }
    throw new AppError("Failed to update project", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Get Project List
=================================*/
exports.getProjectList = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `
      SELECT Project_name, Project_id, Photo,
      Project_Estimation_Cost, Project_status
      FROM project_list
      WHERE tenant_id = ? AND branch_id = ?
      ORDER BY Project_id DESC
      `,
      [tenant_id, branch_id]
    );
    return result[0];
  } catch (error) {
    console.error("❌ getProjectList Error:", error);
    throw new AppError("Failed to fetch projects", 500, error);
  }
};

/* ===============================
   Project Total Cost
=================================*/
exports.getProjectTotalCost = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `
      SELECT IFNULL(SUM(amount),0) as TotalAmount
      FROM payment_details
      WHERE tenant_id = ? AND branch_id = ?
      AND project_id NOT IN (
      SELECT project_id FROM project_list
      WHERE project_status='Completed' AND tenant_id = ? AND branch_id = ?
      )
      `,
      [tenant_id, branch_id, tenant_id, branch_id]
    );
    return result[0];
  } catch (error) {
    console.error("❌ getProjectTotalCost Error:", error);
    throw new AppError("Failed to fetch total cost", 500, error);
  }
};

/* ===============================
   Project Spended (Optimized)
=================================*/
exports.getProjectSpended = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `
      SELECT
      (SELECT IFNULL(SUM(lwd.paid),0)
      FROM labour_worked_details lwd
      INNER JOIN project_list p ON lwd.Project_id = p.Project_id
      WHERE p.tenant_id = ? AND p.branch_id = ?
      AND p.project_status != 'Completed'
      ) AS Labour,
      (SELECT IFNULL(SUM(od.paid),0)
      FROM order_details od
      INNER JOIN project_list p ON od.Project_id = p.Project_id
      WHERE p.tenant_id = ? AND p.branch_id = ?
      AND p.project_status != 'Completed'
      ) AS Orders
      `,
      [tenant_id, branch_id, tenant_id, branch_id]
    );
    return {
      AmountSpended: Number(result[0].Labour) + Number(result[0].Orders),
    };
  } catch (error) {
    console.error("❌ getProjectSpended Error:", error);
    throw new AppError("Failed to fetch spent amount", 500, error);
  }
};

/* ===============================
   Individual Project Spended (Optimized)
=================================*/
exports.getIndividualProjectSpended = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `
      SELECT
      p.Project_id,
      IFNULL(l.Labour,0) as Labour_Spended,
      IFNULL(o.Orders,0) as Material_Spended,
      (IFNULL(l.Labour,0) + IFNULL(o.Orders,0)) as AmountSpended
      FROM project_list p
      LEFT JOIN (
      SELECT Project_id, SUM(Paid) as Labour
      FROM labour_worked_details
      GROUP BY Project_id
      ) l ON p.Project_id = l.Project_id
      LEFT JOIN (
      SELECT Project_id, SUM(Paid) as Orders
      FROM order_details
      GROUP BY Project_id
      ) o ON p.Project_id = o.Project_id
      WHERE p.tenant_id = ? AND p.branch_id = ?
      `,
      [tenant_id, branch_id]
    );
    return result[0];
  } catch (error) {
    console.error("❌ getIndividualProjectSpended Error:", error);
    throw new AppError("Failed to fetch project spending", 500, error);
  }
};

/* ===============================
   Individual Project Total (Optimized)
=================================*/
exports.getIndividualProjectTotal = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `
      SELECT
      p.Project_id,
      IFNULL(SUM(pd.Amount),0) as Amount
      FROM project_list p
      LEFT JOIN payment_details pd
      ON p.Project_id = pd.Project_id AND pd.tenant_id = ? AND pd.branch_id = ?
      WHERE p.tenant_id = ? AND p.branch_id = ?
      GROUP BY p.Project_id
      `,
      [tenant_id, branch_id, tenant_id, branch_id]
    );
    return result[0];
  } catch (error) {
    console.error("❌ getIndividualProjectTotal Error:", error);
    throw new AppError("Failed to fetch project totals", 500, error);
  }
};

/* ===============================
   Get Project By ID
=================================*/
exports.getProjectById = async (id, tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      `SELECT * FROM project_list
      WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [id, tenant_id, branch_id]
    );
    if (!result[0] || result[0].length === 0) {
      throw new AppError("Project not found", 404);
    }
    return result[0][0];
  } catch (error) {
    console.error("❌ getProjectById Error:", error);
    throw new AppError("Failed to fetch project", 500, error);
  }
};

/* ===============================
   Delete Project Payment
=================================*/
exports.deleteProjectPayment = async (details, tenant_id, branch_id) => {
  let conn;
  
  try {
    // ✅ Validate input
    if (!details?.Payment_id) {
      throw new AppError("Payment_id is required", 400);
    }

    conn = await pool.getConnection();
    
    // ✅ FIX: Destructure the first element from the query result array
    const result = await conn.query(
      `DELETE FROM payment_details
       WHERE Payment_id = ? AND Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [details.Payment_id, details.Project_id, tenant_id, branch_id]
    );

    console.log("🚀 ~ Delete result:", result);
    
    // ✅ Now result.affectedRows works correctly
    if (!result || result[0].affectedRows === 0) {
      throw new AppError("Payment record not found or already deleted", 404);
    }
    
    return { 
      success: true, 
      message: "Payment deleted successfully",
      deletedCount: result.affectedRows 
    };
    
  } catch (error) {
    console.error("❌ deleteProjectPayment Error:", error);
    
    // Preserve AppError, wrap others
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to delete payment", 500, error);
    
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project Details Service (Insert)
=================================*/
exports.projectDetailsService = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };
    const {
      Project_name,
      Project_type,
      Project_cost,
      Margin,
      Project_Estimation_Cost,
      Project_start_date,
      Estimated_end_date,
      ProjectStatus,
      Site_location,
      Contractor,
      Site_supervisor,
      Username,
      photo,
    } = details;
    const result = await conn.query(
      `INSERT INTO project_list
      (tenant_id, branch_id, Project_name, Project_type, Project_cost, Margin,
      Project_Estimation_Cost, Project_start_date, Estimated_end_date,
      Site_location, Project_Status, Contractor, Site_supervisor,
      Photo, Created_by, CREATED_DATETIME)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        tenant_id,
        branch_id,
        Project_name,
        Project_type,
        Project_cost,
        Margin,
        Project_Estimation_Cost,
        Project_start_date,
        Estimated_end_date,
        Site_location,
        ProjectStatus,
        Contractor,
        Site_supervisor,
        photo,
        Username,
      ]
    );
    console.log("✅ Data inserted successfully");
    return {
      success: true,
      message: "Project created successfully",
      insertId: result[0].insertId,
    };
  } catch (error) {
    console.error("❌ projectDetailsService Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Project already exists", 409, error);
    }
    throw new AppError("Failed to create project", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Project List (Legacy)
=================================*/
exports.projectList = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT Project_name, Project_id, Photo, Project_Estimation_Cost, Project_status FROM project_list WHERE tenant_id = ? AND branch_id = ? ORDER BY Project_id DESC",
      [tenant_id, branch_id]
    );
    return result;
  } catch (err) {
    console.error("❌ projectList Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch projects", 500, err);
  }
};

/* ===============================
   Project Total Cost (Legacy)
=================================*/
exports.ProjectTotalCost = async (tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT IFNULL(SUM(amount),0) as TotalAmount FROM payment_details WHERE tenant_id = ? AND branch_id = ? AND project_id NOT IN (SELECT project_id FROM project_list WHERE project_status='Completed' AND tenant_id = ? AND branch_id = ?)",
      [tenant_id, branch_id, tenant_id, branch_id]
    );
    return result[0];
  } catch (err) {
    console.error("❌ ProjectTotalCost Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch total cost", 500, err);
  }
};

/* ===============================
   Project Spended (Legacy)
=================================*/
exports.ProjectSpended = async (tenant_id, branch_id) => {
  try {
    const row2 = await pool.query(
      "SELECT IFNULL(SUM(lwd.paid),0) as Labour FROM labour_worked_details lwd INNER JOIN project_list p ON lwd.Project_id = p.Project_id WHERE p.tenant_id = ? AND p.branch_id = ? AND p.project_status != 'Completed'",
      [tenant_id, branch_id]
    );
    const row3 = await pool.query(
      "SELECT IFNULL(SUM(od.paid),0) as Orders FROM order_details od INNER JOIN project_list p ON od.Project_id = p.Project_id WHERE p.tenant_id = ? AND p.branch_id = ? AND p.project_status != 'Completed'",
      [tenant_id, branch_id]
    );
    const AmountSpended = Number(row2[0].Labour) + Number(row3[0].Orders);
    return { AmountSpended };
  } catch (err) {
    console.error("❌ ProjectSpended Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch spent amount", 500, err);
  }
};

/* ===============================
   Individual Project Spended (Legacy)
=================================*/
exports.IndividualProjectSpended = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const row = await conn.query(
      "SELECT Project_id FROM project_list WHERE tenant_id = ? AND branch_id = ?",
      [tenant_id, branch_id]
    );
    const lists = [];
    for (const items of row) {
      const row3 = await conn.query(
        "SELECT IFNULL(SUM(Amount),0) as Orders FROM payment_details WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
        [items.Project_id, tenant_id, branch_id]
      );
      const Amount = Number(row3[0].Orders || 0);
      lists.push({ Project_id: items.Project_id, Amount });
    }
    return lists;
  } catch (err) {
    console.error("❌ IndividualProjectSpended Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch project spending", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Individual Project Total (Legacy)
=================================*/
exports.IndividualProjectTotal = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const row = await conn.query(
      "SELECT Project_id FROM project_list WHERE tenant_id = ? AND branch_id = ?",
      [tenant_id, branch_id]
    );
    const lists = [];
    for (const items of row) {
      const row3 = await conn.query(
        "SELECT IFNULL(SUM(Amount),0) as Orders FROM payment_details WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
        [items.Project_id, tenant_id, branch_id]
      );
      const Amount = Number(row3[0].Orders || 0);
      lists.push({ Project_id: items.Project_id, Amount });
    }
    return lists;
  } catch (err) {
    console.error("❌ IndividualProjectTotal Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch project totals", 500, err);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Fetch Project Edit
=================================*/
exports.FetchProjectEdit = async (details, tenant_id, branch_id) => {
  try {
    const result = await pool.query(
      "SELECT * FROM project_list WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
      [details.pro_id, tenant_id, branch_id]
    );
    if (!result[0] || result[0].length === 0) {
      throw new AppError("Project not found", 404);
    }
    return result[0];
  } catch (err) {
    console.error("❌ FetchProjectEdit Error:", err);
    throw err instanceof AppError
      ? err
      : new AppError("Failed to fetch project", 500, err);
  }
};

/* ===============================
   Edit Project Details
=================================*/
exports.EditProject_Details = async (details, tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const {
      Project_name,
      Project_type,
      Project_cost,
      Project_start_date,
      Margin,
      Project_Estimation_Cost,
      Estimated_end_date,
      Site_location,
      Contractor,
      photo,
      Project_status,
      Site_supervisor,
      Project_id,
    } = details;
    const rows = await conn.query(
      "SELECT Photo FROM project_list WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?",
      [Project_id, tenant_id, branch_id]
    );
    if (!rows[0] || rows[0].length === 0) {
      throw new AppError("Project not found", 404);
    }
    const oldPhoto = rows[0][0].Photo || null;
    if (oldPhoto && photo && oldPhoto !== photo) {
      await deleteFile(oldPhoto);
    }
    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };
    const Startdate = convert(Project_start_date);
    const Enddate = convert(Estimated_end_date);
    const result = await conn.query(
      `UPDATE project_list SET
      Project_name = ?, Project_type = ?, Project_cost = ?, Margin = ?,
      Project_Estimation_Cost = ?, Project_start_date = ?,
      Estimated_end_date = ?, Site_location = ?, Contractor = ?,
      Site_supervisor = ?, Photo = ?, Project_status = ?
      WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [
        Project_name,
        Project_type,
        Project_cost,
        Margin,
        Project_Estimation_Cost,
        Startdate,
        Enddate,
        Site_location,
        Contractor,
        Site_supervisor,
        photo,
        Project_status,
        Project_id,
        tenant_id,
        branch_id,
      ]
    );
    if (result[0].affectedRows === 0) {
      throw new AppError("Failed to update project", 500);
    }
    return { success: true, message: "Project updated successfully" };
  } catch (error) {
    console.error("❌ EditProject_Details Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new AppError("Project name already exists", 409, error);
    }
    throw new AppError("Failed to update project", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Dashboard: Get Project Financial Summary (All Projects)
=================================*/
exports.getProjectFinancialSummary = async (tenant_id, branch_id) => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Get all projects for tenant/branch
    const projects = await conn.query(
      `SELECT Project_id, Project_name, Project_cost, Project_status 
       FROM project_list 
       WHERE tenant_id = ? AND branch_id = ?`,
      [tenant_id, branch_id]
    );

    const financialData = await Promise.all(
      projects.map(async (project) => {
        return await this.getProjectFinancials(conn, project.Project_id, tenant_id, branch_id,project.Project_name);
      })
    );

    return financialData;
  } catch (error) {
    console.error("❌ getProjectFinancialSummary Error:", error);
    throw new AppError("Failed to fetch project financial summary", 500, error);
  } finally {
    if (conn) conn.release();
  }
};

/* ===============================
   Dashboard: Get Financials for Single Project
=================================*/
exports.getProjectFinancials = async (conn, project_id, tenant_id, branch_id, project_name) => {
  try {
    // 1. INCOME: Payment Details + Daily Process (Paid amounts)
    const incomeResult = await conn.query(
      `SELECT 
         COALESCE(SUM(pd.Amount), 0) as payment_income,
         COALESCE(SUM(dpd.Paid), 0) as process_income
       FROM project_list p
       LEFT JOIN payment_details pd ON p.Project_id = pd.Project_id 
         AND pd.tenant_id = ? AND pd.branch_id = ?
       LEFT JOIN daily_process_details dpd ON p.Project_id = dpd.Project_id 
         AND dpd.tenant_id = ? AND dpd.branch_id = ?
       WHERE p.Project_id = ?`,
      [tenant_id, branch_id, tenant_id, branch_id, project_id]
    );

    // 2. MATERIAL: Material Payments + Order Details
    const materialResult = await conn.query(
      `SELECT 
         COALESCE(SUM(mp.Amount), 0) as material_paid,
         COALESCE(SUM(od.Amount), 0) as material_ordered,
         COALESCE(SUM(od.Paid), 0) as order_paid,
         COALESCE(SUM(od.Balance), 0) as order_balance
       FROM project_list p
       LEFT JOIN material_payments mp ON p.Project_id = mp.Project_Id 
         AND mp.tenant_id = ? AND mp.branch_id = ?
       LEFT JOIN order_details od ON p.Project_id = od.Project_id 
         AND od.tenant_id = ? AND od.branch_id = ?
       WHERE p.Project_id = ?`,
      [tenant_id, branch_id, tenant_id, branch_id, project_id]
    );

    // 3. LABOUR: Labour Worked Details
    const labourResult = await conn.query(
      `SELECT 
         COALESCE(SUM(Total), 0) as labour_total,
         COALESCE(SUM(Paid), 0) as labour_paid,
         COALESCE(SUM(Balance), 0) as labour_balance,
         COUNT(*) as labour_entries
       FROM labour_worked_details
       WHERE Project_id = ? AND tenant_id = ? AND branch_id = ?`,
      [project_id, tenant_id, branch_id]
    );

    // Calculate totals
    const totalIncome = Number(incomeResult[0].payment_income) + Number(incomeResult[0].process_income);
    const totalMaterial = Number(materialResult[0].material_ordered); // Use ordered amount as material expense
    const totalLabour = Number(labourResult[0].labour_total);
    const totalExpense = totalMaterial + totalLabour;
    const profit = totalIncome - totalExpense;

    return {
      Project_id: project_id,
      Project_name: project_name,
      income: {
        total: totalIncome,
        payments: Number(incomeResult[0].payment_income),
        daily_process: Number(incomeResult[0].process_income)
      },
      expense: {
        total: totalExpense,
        material: totalMaterial,
        labour: totalLabour
      },
      material: {
        total: totalMaterial,
        paid: Number(materialResult[0].order_paid),
        balance: Number(materialResult[0].order_balance)
      },
      labour: {
        total: totalLabour,
        paid: Number(labourResult[0].labour_paid),
        balance: Number(labourResult[0].labour_balance),
        entries: labourResult[0].labour_entries
      },
      profit: profit,
      profit_margin: totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error("❌ getProjectFinancials Error:", error);
    throw error;
  }
};

/* ===============================
   Dashboard: Get Summary Cards Data
=================================*/
exports.getDashboardSummary = async (tenant_id, branch_id) => {
  try {
    // Total Projects & Active Projects
    const projectStats = await pool.query(
      `SELECT 
         COUNT(*) as total_projects,
         SUM(CASE WHEN Project_status = 'Active' THEN 1 ELSE 0 END) as active_projects
       FROM project_list
       WHERE tenant_id = ? AND branch_id = ?`,
      [tenant_id, branch_id]
    );

    // Total Income (Payments + Daily Process Paid)
    const incomeData = await pool.query(
      `SELECT 
         COALESCE(SUM(pd.Amount), 0) as payment_income,
         COALESCE(SUM(dpd.Paid), 0) as process_income
       FROM project_list p
       LEFT JOIN payment_details pd ON p.Project_id = pd.Project_id 
         AND pd.tenant_id = ? AND pd.branch_id = ?
       LEFT JOIN daily_process_details dpd ON p.Project_id = dpd.Project_id 
         AND dpd.tenant_id = ? AND dpd.branch_id = ?
       WHERE p.tenant_id = ? AND p.branch_id = ?`,
      [tenant_id, branch_id, tenant_id, branch_id, tenant_id, branch_id]
    );

    // Total Material Expense
    const materialData = await pool.query(
      `SELECT COALESCE(SUM(Amount), 0) as total_material
       FROM order_details
       WHERE tenant_id = ? AND branch_id = ?`,
      [tenant_id, branch_id]
    );

    // Total Labour Expense
    const labourData = await pool.query(
      `SELECT COALESCE(SUM(Total), 0) as total_labour
       FROM labour_worked_details
       WHERE tenant_id = ? AND branch_id = ?`,
      [tenant_id, branch_id]
    );

    const totalIncome = Number(incomeData[0].payment_income) + Number(incomeData[0].process_income);
    const totalMaterial = Number(materialData[0].total_material);
    const totalLabour = Number(labourData[0].total_labour);
    const totalExpense = totalMaterial + totalLabour;
    const totalProfit = totalIncome - totalExpense;

    return {
      total_projects: projectStats[0].total_projects,
      active_projects: projectStats[0].active_projects,
      total_income: totalIncome,
      total_expense: totalExpense,
      total_material: totalMaterial,
      total_labour: totalLabour,
      total_profit: totalProfit,
      profit_margin: totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(2) : 0
    };
  } catch (error) {
    console.error("❌ getDashboardSummary Error:", error);
    throw new AppError("Failed to fetch dashboard summary", 500, error);
  }
};

/* ===============================
   Dashboard: Get Project Comparison Data (For Charts)
=================================*/
exports.getProjectComparisonData = async (tenant_id, branch_id) => {
  try {
    const results = await pool.query(
      `SELECT 
         p.Project_id,
         p.Project_name,
         p.Project_cost as budget,
         COALESCE(SUM(pd.Amount), 0) as income,
         COALESCE(SUM(od.Amount), 0) as material_expense,
         COALESCE(SUM(lwd.Total), 0) as labour_expense,
         (COALESCE(SUM(od.Amount), 0) + COALESCE(SUM(lwd.Total), 0)) as total_expense,
         (COALESCE(SUM(pd.Amount), 0) - (COALESCE(SUM(od.Amount), 0) + COALESCE(SUM(lwd.Total), 0))) as profit
       FROM project_list p
       LEFT JOIN payment_details pd ON p.Project_id = pd.Project_id 
         AND pd.tenant_id = ? AND pd.branch_id = ?
       LEFT JOIN order_details od ON p.Project_id = od.Project_id 
         AND od.tenant_id = ? AND od.branch_id = ?
       LEFT JOIN labour_worked_details lwd ON p.Project_id = lwd.Project_id 
         AND lwd.tenant_id = ? AND lwd.branch_id = ?
       WHERE p.tenant_id = ? AND p.branch_id = ?
       GROUP BY p.Project_id, p.Project_name, p.Project_cost
       ORDER BY p.Project_id`,
      [tenant_id, branch_id, tenant_id, branch_id, tenant_id, branch_id, tenant_id, branch_id]
    );

    return results;
  } catch (error) {
    console.error("❌ getProjectComparisonData Error:", error);
    throw new AppError("Failed to fetch project comparison data", 500, error);
  }
};

/* ===============================
   Dashboard: Get Monthly Trend Data for Project
=================================*/
exports.getMonthlyTrendData = async (project_id, tenant_id, branch_id, months = 12) => {
  try {
    const results = await pool.query(
      `SELECT 
         DATE_FORMAT(COALESCE(pd.Payment_date, od.Order_date, lwd.DATE), '%Y-%m') as month,
         COALESCE(SUM(pd.Amount), 0) as income,
         COALESCE(SUM(od.Amount), 0) as material_expense,
         COALESCE(SUM(lwd.Total), 0) as labour_expense
       FROM project_list p
       LEFT JOIN payment_details pd ON p.Project_id = pd.Project_id 
         AND pd.tenant_id = ? AND pd.branch_id = ?
       LEFT JOIN order_details od ON p.Project_id = od.Project_id 
         AND od.tenant_id = ? AND od.branch_id = ?
       LEFT JOIN labour_worked_details lwd ON p.Project_id = lwd.Project_id 
         AND lwd.tenant_id = ? AND lwd.branch_id = ?
       WHERE p.Project_id = ? AND p.tenant_id = ? AND p.branch_id = ?
       GROUP BY DATE_FORMAT(COALESCE(pd.Payment_date, od.Order_date, lwd.DATE), '%Y-%m')
       ORDER BY month DESC
       LIMIT ?`,
      [tenant_id, branch_id, tenant_id, branch_id, tenant_id, branch_id, project_id, tenant_id, branch_id, months]
    );

    return results;
  } catch (error) {
    console.error("❌ getMonthlyTrendData Error:", error);
    throw new AppError("Failed to fetch monthly trend data", 500, error);
  }
};

module.exports = exports;
