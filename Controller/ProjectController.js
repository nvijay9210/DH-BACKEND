const projectService = require("../Service/ProjectService");

/* =========================================
   Create Project
========================================= */
exports.createProject = async (req, res, next) => {
  try {
    const result = await projectService.createProject(req.body);

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
    const projectId = req.params.id;

    const result = await projectService.updateProject({
      ...req.body,
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
    const data = await projectService.getProjectList();

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
    const data = await projectService.getProjectTotalCost();

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
    const data = await projectService.getProjectSpended();

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
    const data = await projectService.getIndividualProjectSpended();

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
    const data = await projectService.getIndividualProjectTotal();

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
    const projectId = req.params.id; // ✅ use params

    const data = await projectService.getProjectById(projectId);

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
    const paymentId = req.params.paymentId;

    const result = await projectService.deleteProjectPayment(paymentId);

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
    const details = req.body;
    //console.log(details)
    const data = await projectService.projectDetailsService(details);

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
    const data = await projectService.projectList();

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
    const data = await projectService.ProjectTotalCost();

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
    const data = await projectService.ProjectSpended();

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
    const data = await projectService.IndividualProjectSpended();

    // console.log("Controller Data:", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.IndividualProjectSpended = async (req, res, next) => {
  try {
    const data = await projectService.IndividualProjectSpended();

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
    const data = await projectService.IndividualProjectTotal();

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
    const data = await projectService.FetchProjectEdit(req.body);

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
    const details = req.body;
    const data = await projectService.EditProject_Details(details);

    // console.log("Controller Data:", data);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};
