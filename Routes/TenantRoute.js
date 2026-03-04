const express = require("express");
const router = express.Router();
const tenantController = require("../Controller/TenantController");
const { validateIds } = require("../Middleware/ContextMiddleware");
const { asyncHandler } = require("../utils/Async");

router.post("/", asyncHandler(tenantController.createTenant));
router.get("/", asyncHandler(tenantController.getTenants));
router.get("/:tenant_id",validateIds, asyncHandler(tenantController.getTenantById));
router.put("/:tenant_id",validateIds, asyncHandler(tenantController.updateTenant));
router.delete("/:tenant_id",validateIds, asyncHandler(tenantController.deleteTenant));

module.exports = router;
