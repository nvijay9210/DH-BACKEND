const projectService = require("../Service/ProjectService");

/* =========================================
   Create Project
========================================= */
exports.createProject = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const result = await projectService.createProject(req.body,tenant_id,branch_id);

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        projectId: result.insertId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Update Project
========================================= */
exports.updateProject = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const projectId = req.params.id;

    const result = await projectService.updateProject({
      ...req.body,
      tenant_id,branch_id,
      Project_id: projectId,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Project List
========================================= */
exports.getProjectList = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.getProjectList( tenant_id,branch_id,);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Total Cost
========================================= */
exports.getProjectTotalCost = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.getProjectTotalCost( tenant_id,branch_id,);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Total Spended
========================================= */
exports.getProjectSpended = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.getProjectSpended( tenant_id,branch_id,);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Individual Project Spended
========================================= */
exports.getIndividualProjectSpended = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.getIndividualProjectSpended( tenant_id,branch_id,);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Individual Project Total
========================================= */
exports.getIndividualProjectTotal = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.getIndividualProjectTotal( tenant_id,branch_id,);

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Get Project By ID
========================================= */
exports.getProjectById = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const projectId = req.params.id; // ✅ use params

    const data = await projectService.getProjectById(projectId, tenant_id,branch_id,);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/* =========================================
   Delete Project Payment
========================================= */
exports.deleteProjectPayment = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const paymentId = req.params.paymentId;

    const result = await projectService.deleteProjectPayment(paymentId, tenant_id,branch_id,);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

exports.projectDetailsController = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    //console.log(details)
    const data = await projectService.projectDetailsService(details, tenant_id,branch_id,);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.projectList = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.projectList( tenant_id,branch_id,);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.ProjectTotalCost = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.ProjectTotalCost( tenant_id,branch_id,);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.ProjectSpended = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.ProjectSpended( tenant_id,branch_id);

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.IndividualProjectSpended = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.IndividualProjectSpended( tenant_id,branch_id);

    // console.log("Controller Data:", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.IndividualProjectTotal = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.IndividualProjectTotal(tenant_id,branch_id);

    // console.log("Controller Data:", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.FetchProjectEdit = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const data = await projectService.FetchProjectEdit(req.body,tenant_id,branch_id);

    // console.log("Controller Data:", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
exports.EditProject_Details = async (req, res, next) => {
  try {
    const { tenant_id, branch_id } = req;
    const details = req.body;
    const data = await projectService.EditProject_Details(details,tenant_id,branch_id);

    // console.log("Controller Data:", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
