const projectService = require("../Service/ProjectService");
const RedisService = require("../Service/RedisService");
const RedisTime=process.env.RedisTime

exports.createProject = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const result = await projectService.createProject(
    req.body,
    tenant_id,
    branch_id
  );

  // Invalidate list caches
  await RedisService.deleteByPattern(`project:list:*`);

  res.status(201).json({
    success: true,
    message: "Project created successfully",
    data: { projectId: result.insertId },
  });
};

exports.updateProject = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const projectId = req.params.id;

  await projectService.updateProject({
    ...req.body,
    tenant_id,
    branch_id,
    Project_id: projectId,
  });

  // Invalidate caches
  await RedisService.delete(`project:${projectId}:${tenant_id}:${branch_id}`);
  await RedisService.deleteByPattern(`project:list:*`);
  await RedisService.deleteByPattern(`project:cost:*`);
  await RedisService.deleteByPattern(`project:spended:*`);

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
  });
};

exports.getProjectList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `project:list:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await projectService.getProjectList(tenant_id, branch_id);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getProjectTotalCost = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `project:cost:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await projectService.getProjectTotalCost(tenant_id, branch_id);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({ success: true, data });
};

exports.getProjectSpended = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `project:spended:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await projectService.getProjectSpended(tenant_id, branch_id);

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({ success: true, data });
};

exports.getIndividualProjectSpended = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `project:individual:spended:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await projectService.getIndividualProjectSpended(
    tenant_id,
    branch_id
  );

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getIndividualProjectTotal = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `project:individual:total:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  }

  data = await projectService.getIndividualProjectTotal(
    tenant_id,
    branch_id
  );

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getProjectById = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const projectId = req.params.id;
  const cacheKey = `project:${projectId}:${tenant_id}:${branch_id}`;

  // Check cache
  let data = await RedisService.read(cacheKey);
  if (data) {
    return res.status(200).json({ success: true, data });
  }

  data = await projectService.getProjectById(
    projectId,
    tenant_id,
    branch_id
  );

  // Cache for 1 hour
  await RedisService.create(cacheKey, data, RedisTime);

  res.status(200).json({ success: true, data });
};

exports.deleteProjectPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  await projectService.deleteProjectPayment(details, tenant_id, branch_id);

  res.status(200).json({
    success: true,
    message: "Payment deleted successfully",
  });
};

exports.projectDetailsController = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await projectService.projectDetailsService(
    details,
    tenant_id,
    branch_id
  );

  res.status(200).json({ success: true, data });
};

exports.projectList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  console.log(tenant_id, branch_id);
  const data = await projectService.projectList(tenant_id, branch_id);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.ProjectTotalCost = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.ProjectTotalCost(tenant_id, branch_id);

  res.status(200).json({ success: true, data });
};

exports.ProjectSpended = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.ProjectSpended(tenant_id, branch_id);

  res.status(200).json({ success: true, data });
};

exports.IndividualProjectSpended = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.IndividualProjectSpended(
    tenant_id,
    branch_id
  );

  res.status(200).json({ success: true, data });
};

exports.IndividualProjectTotal = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.IndividualProjectTotal(
    tenant_id,
    branch_id
  );

  res.status(200).json({ success: true, data });
};

exports.FetchProjectEdit = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.FetchProjectEdit(
    req.body,
    tenant_id,
    branch_id
  );

  res.status(200).json({ success: true, data });
};

exports.EditProject_Details = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const details = req.body;

  const data = await projectService.EditProject_Details(
    details,
    tenant_id,
    branch_id
  );

  res.status(200).json({ success: true, data });
};

/* ===============================
   Dashboard: Get Project Financial Summary
   GET /api/dashboard/projects/financials
=================================*/
exports.getProjectFinancialSummary = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `dashboard:financials:${tenant_id}:${branch_id}`;

  try {
    // Check cache
    let data = await RedisService.read(cacheKey);
    if (data) {
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    }

    data = await projectService.getProjectFinancialSummary(tenant_id, branch_id);

    // Cache for 30 minutes (financial data changes frequently)
    await RedisService.create(cacheKey, data, 1800);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ getProjectFinancialSummary Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch financial summary",
    });
  }
};

/* ===============================
   Dashboard: Get Summary Cards
   GET /api/dashboard/summary
=================================*/
exports.getDashboardSummary = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `dashboard:summary:${tenant_id}:${branch_id}`;

  try {
    // Check cache
    let data = await RedisService.read(cacheKey);
    if (data) {
      return res.status(200).json({ success: true, data });
    }

    data = await projectService.getDashboardSummary(tenant_id, branch_id);

    // Cache for 5 minutes (summary updates frequently)
    await RedisService.create(cacheKey, data, 300);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ getDashboardSummary Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard summary",
    });
  }
};

/* ===============================
   Dashboard: Get Project Comparison (Charts)
   GET /api/dashboard/projects/comparison
=================================*/
exports.getProjectComparisonData = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const cacheKey = `dashboard:comparison:${tenant_id}:${branch_id}`;

  try {
    // Check cache
    let data = await RedisService.read(cacheKey);
    if (data) {
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    }

    data = await projectService.getProjectComparisonData(tenant_id, branch_id);

    // Cache for 15 minutes
    await RedisService.create(cacheKey, data, 900);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ getProjectComparisonData Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch comparison data",
    });
  }
};

/* ===============================
   Dashboard: Get Monthly Trend for Project
   GET /api/dashboard/projects/:project_id/trend?months=12
=================================*/
exports.getMonthlyTrendData = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const { project_id } = req.params;
  const { months = 12 } = req.query;
  const cacheKey = `dashboard:trend:${project_id}:${tenant_id}:${branch_id}:${months}`;

  try {
    // Check cache
    let data = await RedisService.read(cacheKey);
    if (data) {
      return res.status(200).json({ success: true, data });
    }

    data = await projectService.getMonthlyTrendData(
      project_id,
      tenant_id,
      branch_id,
      parseInt(months)
    );

    // Cache for 10 minutes
    await RedisService.create(cacheKey, data, 600);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ getMonthlyTrendData Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch trend data",
    });
  }
};

/* ===============================
   Dashboard: Invalidate Cache on Data Change
   Call this after create/update/delete operations
=================================*/
exports.invalidateDashboardCache = async (tenant_id, branch_id, project_id = null) => {
  try {
    const patterns = [
      `dashboard:financials:${tenant_id}:${branch_id}`,
      `dashboard:summary:${tenant_id}:${branch_id}`,
      `dashboard:comparison:${tenant_id}:${branch_id}`,
    ];
    
    if (project_id) {
      patterns.push(`dashboard:trend:${project_id}:${tenant_id}:${branch_id}:*`);
    }
    
    for (const pattern of patterns) {
      await RedisService.deleteByPattern(pattern);
    }
    
    console.log("✅ Dashboard cache invalidated");
  } catch (error) {
    console.error("❌ invalidateDashboardCache Error:", error);
  }
};
