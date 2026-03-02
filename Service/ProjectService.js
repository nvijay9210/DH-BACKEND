const { pool } = require("../config/db");
const { deleteFile } = require("../utils/UploadFile");

/* ===============================
   Create Project
=================================*/
exports.createProject = async (data) => {
  const query = `
    INSERT INTO project_list 
    (Project_name, Project_type, Project_cost, Margin,
     Project_Estimation_Cost, Project_start_date,
     Estimated_end_date, Site_location,
     Project_status, Contractor, Site_supervisor,
     Photo, Created_by, CREATED_DATETIME)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const result = await pool.query(query, [
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

  return result;
};

/* ===============================
   Update Project
=================================*/
exports.updateProject = async (data) => {
  const query = `
    UPDATE project_list 
    SET Project_name=?,
        Project_type=?,
        Project_cost=?,
        Margin=?,
        Project_Estimation_Cost=?,
        Project_start_date=?,
        Estimated_end_date=?,
        Site_location=?,
        Contractor=?,
        Site_supervisor=?,
        Photo=?,
        Project_status=?
    WHERE Project_id=?
  `;

  return await pool.query(query, [
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
  ]);
};

/* ===============================
   Get Project List
=================================*/
exports.getProjectList = async () => {
  return await pool.query(`
    SELECT Project_name, Project_id, Photo,
           Project_Estimation_Cost, Project_status
    FROM project_list
    ORDER BY Project_id DESC
  `);
};

/* ===============================
   Project Total Cost
=================================*/
exports.getProjectTotalCost = async () => {
  const rows = await pool.query(`
    SELECT IFNULL(SUM(amount),0) as TotalAmount 
    FROM payment_details 
    WHERE project_id NOT IN 
    (SELECT project_id FROM project_list WHERE project_status='Completed')
  `);

  return rows[0];
};

/* ===============================
   Project Spended (Optimized)
=================================*/
exports.getProjectSpended = async () => {
  const rows = await pool.query(`
    SELECT 
      (SELECT IFNULL(SUM(paid),0) FROM labour_worked_details) AS Labour,
      (SELECT IFNULL(SUM(paid),0) FROM order_details) AS Orders
  `);

  return {
    AmountSpended: Number(rows[0].Labour) + Number(rows[0].Orders),
  };
};

/* ===============================
   Individual Project Spended (Optimized)
=================================*/
exports.getIndividualProjectSpended = async () => {
  const rows = await pool.query(`
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
  `);

  return rows;
};

/* ===============================
   Individual Project Total (Optimized)
=================================*/
exports.getIndividualProjectTotal = async () => {
  const rows = await pool.query(`
    SELECT 
      p.Project_id,
      IFNULL(SUM(pd.Amount),0) as Amount
    FROM project_list p
    LEFT JOIN payment_details pd 
      ON p.Project_id = pd.Project_id
    GROUP BY p.Project_id
  `);

  return rows;
};

/* ===============================
   Get Project By ID
=================================*/
exports.getProjectById = async (id) => {
  const rows = await pool.query(
    `SELECT * FROM project_list WHERE Project_id=?`,
    [id]
  );
  return rows[0];
};

/* ===============================
   Delete Project Payment
=================================*/
exports.deleteProjectPayment = async (paymentId) => {
  return await pool.query(`DELETE FROM payment_details WHERE Payment_id=?`, [
    paymentId,
  ]);
};

exports.projectDetailsService = async (details) => {
  const date = new Date();

  const convert = (str) => {
    var date = new Date(str),
      mnth = ("0" + (date.getMonth() + 1)).slice(-2),
      day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
  };

  const formattedDate = convert(date);
  //console.log(req.body);
  try {
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

    await pool.query(
      "INSERT INTO project_list (Project_name, Project_type, Project_cost, Margin, Project_Estimation_Cost, Project_start_date, Estimated_end_date, Site_location,Project_Status, Contractor, Site_supervisor, Photo,Created_by,CREATED_DATETIME) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
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
        formattedDate,
      ]
    );

    console.log("Data inserted successfully");
    return "Data inserted successfully";
  } catch (error) {
    console.error("Error:", error);
  }
};

exports.projectList = async () => {
  try {
    const rows = await pool.query(
      "SELECT Project_name, Project_id, Photo,Project_Estimation_Cost,Project_status FROM project_list ORDER BY Project_id DESC"
    );
    // const rows1 = await pool.query("SELECT Sum(Project_Estimation_Cost) FROM project_list");
    return rows;
  } catch (err) {
    console.log("Connection Failed", err);
  }
};

exports.ProjectTotalCost = async () => {
  try {
    const rows1 = await pool.query(
      "SELECT SUM(amount) as TotalAmount FROM payment_details WHERE project_id NOT IN   (SELECT project_id FROM project_list WHERE project_status='Completed') "
    );
    return rows1[0];
  } catch (err) {
    console.log("Connection Failed", err);
  }
};

exports.ProjectSpended = async () => {
  try {
    //const row1 = await pool.query('SELECT SUM(Amount) as Mesure FROM daily_process_details where Status = "Paid"');
    const row2 = await pool.query(
      "SELECT SUM(paid) as Labour FROM labour_worked_details WHERE project_id NOT IN   (SELECT project_id FROM project_list WHERE project_status='Completed')"
    );
    const row3 = await pool.query(
      "SELECT SUM(paid) as Orders FROM order_details WHERE project_id NOT IN   (SELECT project_id FROM project_list WHERE project_status='Completed')"
    );
    const AmountSpended = Number(row2[0].Labour) + Number(row3[0].Orders);
    return AmountSpended;
  } catch (err) {
    console.log("Connection Failed", err);
  }
};

exports.IndividualProjectSpended = async () => {
  const row = await pool.query("SELECT Project_id FROM project_list");

  const lists = [];

  const promises = row.map(async (items) => {
    const row3 = await pool.query(
      "SELECT SUM(Amount) as Orders FROM payment_details WHERE Project_id = ?",
      [items.Project_id]
    );

    const Amount = Number(row3[0].Orders || 0);

    lists.push({
      Project_id: items.Project_id,
      Amount,
    });
  });

  await Promise.all(promises);

  return lists;
};

exports.IndividualProjectTotal = async () => {
  try {
    const row = await pool.query("SELECT Project_id FROM project_list");
    const lists = [];

    async function fetchData(row) {
      const promises = row.map(async (items) => {
        const row3 = await pool.query(
          "SELECT SUM(Amount) as Orders FROM payment_details WHERE Project_id = ?",
          [items.Project_id]
        );

        const Amount = Number(row3[0].Orders || 0);

        lists.push({
          Project_id: items.Project_id,
          Amount,
        });
      });

      await Promise.all(promises);
      return lists;
    }

    return fetchData(row); // ✅ VERY IMPORTANT
  } catch (err) {
    console.log("Connection Failed", err);
    throw err; // also good practice
  }
};
exports.FetchProjectEdit = async (details) => {
  try {
    const Project = await pool
      .query("select * from project_list where Project_id = ? ;", [
        details.pro_id,
      ])
      .catch((err) => console.log(err));
    return Project[0];
  } catch (err) {
    console.log("Connection Failed", err);
    throw err; // also good practice
  }
};

exports.EditProject_Details = async (details) => {
  try {
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

    // ==========================
    // 📌 Get Existing Photo
    // ==========================
    const [rows] = await pool.query(
      "SELECT Photo FROM project_list WHERE Project_id = ?",
      [Project_id]
    );

    console.log('roes:',rows)

    const oldPhoto = rows?.Photo || null;

    // ==========================
    // 🗑 Delete old photo if changed
    // ==========================
    if (oldPhoto && photo && oldPhoto !== photo) {
      await deleteFile(oldPhoto);
    }

    // ==========================
    // 📅 Convert Dates
    // ==========================
    const convert = (str) => {
      if (!str) return null;
      const date = new Date(str);
      const mnth = ("0" + (date.getMonth() + 1)).slice(-2);
      const day = ("0" + date.getDate()).slice(-2);
      return [date.getFullYear(), mnth, day].join("-");
    };

    const Startdate = convert(Project_start_date);
    const Enddate = convert(Estimated_end_date);

    // ==========================
    // 💾 Update DB
    // ==========================
    await pool.query(
      `UPDATE project_list SET 
        Project_name = ?, 
        Project_type = ?, 
        Project_cost = ?, 
        Margin = ?, 
        Project_Estimation_Cost = ?, 
        Project_start_date = ?, 
        Estimated_end_date = ?, 
        Site_location = ?, 
        Contractor = ?, 
        Site_supervisor = ?, 
        Photo = ?, 
        Project_status = ? 
      WHERE Project_id = ?`,
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
      ]
    );

    return "Data Updated successfully";

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

