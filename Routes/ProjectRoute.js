const express = require("express");
const router = express.Router();

const projectController = require("../Controller/ProjectController");
const { validate } = require("../utils/Validate");
const {
  createProjectSchema,
  updateProjectSchema,
} = require("../Validation/ProjectValidation");
const { asyncHandler } = require("../utils/Async");
const { dynamicUpload } = require("../utils/UploadFile");

/* =========================================
   Project CRUD
========================================= */

// Create Project
// router.post(
//   "/projects",
// //   validate(validateCreateProject),
//   asyncHandler(projectController.createProject)
// );

// // Update Project
// router.put(
//   "/projects/:id",
// //   validate(validateUpdateProject),
//   asyncHandler(projectController.updateProject)
// );

// // Get All Projects
// router.get(
//   "/projects",
//   asyncHandler(projectController.getProjectList)
// );

// // Get Project By ID
// router.get(
//   "/projects/:id",
//   asyncHandler(projectController.getProjectById)
// );

// /* =========================================
//    Project Financial Summary
// ========================================= */

// router.get(
//   "/projects/summary/total-cost",
//   asyncHandler(projectController.getProjectTotalCost)
// );

// router.get(
//   "/projects/summary/spended",
//   asyncHandler(projectController.getProjectSpended)
// );

// router.get(
//   "/projects/summary/individual-spended",
//   asyncHandler(projectController.getIndividualProjectSpended)
// );

// router.get(
//   "/projects/summary/individual-total",
//   asyncHandler(projectController.getIndividualProjectTotal)
// );

// /* =========================================
//    Payment
// ========================================= */

// router.delete(
//   "/projects/payment/:paymentId",
//   asyncHandler(projectController.deleteProjectPayment)
// );

router.post(
  "/Project_Details",
  dynamicUpload({
    folder: "Project",
    fields: [{ name: "photo", type: "photo", maxCount: 10 }],
  }),
  //   validate(validateCreateProject),
  asyncHandler(projectController.projectDetailsController)
);
router.get("/Project_List", asyncHandler(projectController.projectList));
router.get(
  "/ProjectTotalCost",
  asyncHandler(projectController.ProjectTotalCost)
);
router.get("/ProjectSpended", asyncHandler(projectController.ProjectSpended));
router.get(
  "/IndividualProjectSpended",
  asyncHandler(projectController.IndividualProjectSpended)
);
router.get(
  "/IndividualProjectTotal",
  asyncHandler(projectController.IndividualProjectTotal)
);
router.post(
  "/FetchProjectEdit",
  asyncHandler(projectController.FetchProjectEdit)
);
router.post(
  "/EditProject_Details",
  dynamicUpload({
    folder: "Project",
    fields: [{ name: "photo", type: "photo", maxCount: 10 }],
  }),
  asyncHandler(projectController.EditProject_Details)
);

module.exports = router;
