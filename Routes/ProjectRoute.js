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
const authMiddleware = require("../Middleware/AuthMiddleware");

/* =========================================
   Project CRUD
========================================= */

// Create Project
// router.post(
//   "/projects",
// //   validate(validateCreateProject),
//   authMiddleware, asyncHandler(projectController.createProject)
// );

// // Update Project
// router.put(
//   "/projects/:id",
// //   validate(validateUpdateProject),
//   authMiddleware, asyncHandler(projectController.updateProject)
// );

// // Get All Projects
// router.get(
//   "/projects",
//   authMiddleware, asyncHandler(projectController.getProjectList)
// );

// // Get Project By ID
// router.get(
//   "/projects/:id",
//   authMiddleware, asyncHandler(projectController.getProjectById)
// );

// /* =========================================
//    Project Financial Summary
// ========================================= */

// router.get(
//   "/projects/summary/total-cost",
//   authMiddleware, asyncHandler(projectController.getProjectTotalCost)
// );

// router.get(
//   "/projects/summary/spended",
//   authMiddleware, asyncHandler(projectController.getProjectSpended)
// );

// router.get(
//   "/projects/summary/individual-spended",
//   authMiddleware, asyncHandler(projectController.getIndividualProjectSpended)
// );

// router.get(
//   "/projects/summary/individual-total",
//   authMiddleware, asyncHandler(projectController.getIndividualProjectTotal)
// );

// /* =========================================
//    Payment
// ========================================= */

// router.delete(
//   "/projects/payment/:paymentId",
//   authMiddleware, asyncHandler(projectController.deleteProjectPayment)
// );

router.post(
  "/Project_Details",
  dynamicUpload({
    folder: "Project",
    fields: [{ name: "photo", type: "photo", maxCount: 10 }],
  }),
  //   validate(validateCreateProject),
  authMiddleware,
  asyncHandler(projectController.projectDetailsController)
);
router.get(
  "/Project_List",
  authMiddleware,
  asyncHandler(projectController.projectList)
);
router.get(
  "/ProjectTotalCost",
  authMiddleware,
  asyncHandler(projectController.ProjectTotalCost)
);
router.get(
  "/ProjectSpended",
  authMiddleware,
  asyncHandler(projectController.ProjectSpended)
);
router.get(
  "/IndividualProjectSpended",
  authMiddleware,
  asyncHandler(projectController.IndividualProjectSpended)
);
router.get(
  "/IndividualProjectTotal",
  authMiddleware,
  asyncHandler(projectController.IndividualProjectTotal)
);
router.post(
  "/FetchProjectEdit",
  authMiddleware,
  asyncHandler(projectController.FetchProjectEdit)
);
router.put(
  "/EditProject_Details",
  dynamicUpload({
    folder: "Project",
    fields: [{ name: "photo", type: "photo", maxCount: 10 }],
  }),
  authMiddleware,
  asyncHandler(projectController.EditProject_Details)
);

module.exports = router;
