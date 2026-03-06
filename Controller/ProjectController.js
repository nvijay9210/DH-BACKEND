const projectService = require("../Service/ProjectService");

exports.createProject = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const result = await projectService.createProject(
    req.body,
    tenant_id,
    branch_id
  );

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

  res.status(200).json({
    success: true,
    message: "Project updated successfully",
  });
};

exports.getProjectList = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.getProjectList(tenant_id, branch_id);

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getProjectTotalCost = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.getProjectTotalCost(tenant_id, branch_id);

  res.status(200).json({ success: true, data });
};

exports.getProjectSpended = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.getProjectSpended(tenant_id, branch_id);

  res.status(200).json({ success: true, data });
};

exports.getIndividualProjectSpended = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.getIndividualProjectSpended(
    tenant_id,
    branch_id
  );

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getIndividualProjectTotal = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const data = await projectService.getIndividualProjectTotal(
    tenant_id,
    branch_id
  );

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

exports.getProjectById = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const projectId = req.params.id;

  const data = await projectService.getProjectById(
    projectId,
    tenant_id,
    branch_id
  );

  res.status(200).json({ success: true, data });
};

exports.deleteProjectPayment = async (req, res) => {
  const { tenant_id, branch_id } = req;
  const paymentId = req.params.paymentId;

  await projectService.deleteProjectPayment(paymentId, tenant_id, branch_id);

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
