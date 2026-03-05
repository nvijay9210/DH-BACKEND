// utils/buildUserContext.js
const { getTenant } = require("../Service/TenantService");

const {
  decodeToken,
  extractUserInfo,
} = require("../Keycloak/KeycloakAdmin");
const { getUserByKeycloakId } = require("../Service/UserService");
const {
  getBranchByTenantIdAndUserId,
  getAllBranchByTenantId,
} = require("../Service/BranchService");

/**
 * Builds full user context from access token
 * @param {string} accessToken - JWT access token from Keycloak
 * @returns {Promise<Object>} User context object for frontend
 */

async function buildUserContext(accessToken, dbUser) {
  const decodedToken = decodeToken(accessToken);
  const userInfo = await extractUserInfo(decodedToken);
  const role = userInfo.role;

  // ===============================
  // Handle DEV role (no tenant, no branches)
  // ===============================
  if (role === "DEV") {
    return {
      user_id: Number(dbUser.user_id),
      username: dbUser.username,
      role: "DEV",

      tenant_id: null,
      tenant_name: null,
      tenant_domain: null,
      tenant_app_name: null,
      tenant_app_logo: null,
      tenant_app_font: null,
      tenant_app_themes: null,
      payment_type: null,

      branches: null,
      default_branch_id: null,
      default_branch_name: null,
      default_branch_code: null,

      keycloak_user_id: userInfo.userId,
      displayName: userInfo.displayName,
      profile_picture: dbUser.profile_picture || null,
    };
  }

  // ===============================
  // For ADMIN and regular users: load tenant
  // ===============================
  const tenant = await getTenant(dbUser.tenant_id);

  // ===============================
  // Load branches only if NOT DEV
  // ===============================
  let branchData = null;
  let default_branch_id = null;
  let default_branch_name = null;
  let default_branch_code = null;
  let branches;

  if (role === "ADMIN") {
    branches = await getAllBranchByTenantId(dbUser.tenant_id);
  } else {
    branches = await getBranchByTenantIdAndUserId(
      dbUser.tenant_id,
      dbUser.user_id
    );
  }

  // Both ADMIN and regular users can have branches (optional for ADMIN)

  if (branches && branches.length > 0) {
    branchData = branches.map((b) => ({
      branch_id: Number(b.branch_id),
      branch_name: b.branch_name,
      branch_code: b.branch_code,
    }));

    default_branch_id = Number(branchData[0].branch_id);
    default_branch_name = branchData[0].branch_name;
    default_branch_code = branchData[0].branch_code;
  }
  // If no branches → all branch fields remain null (safe for ADMIN)

  // ===============================
  // Enforce branch requirement ONLY for non-ADMIN roles
  // ===============================
  if (role !== "ADMIN" && (!branches || branches.length === 0)) {
    throw new Error("No branches assigned to user");
  }

  return {
    user_id: Number(dbUser.user_id),
    username: dbUser.username,
    role,

    tenant_id: Number(tenant.tenant_id),
    tenant_name: tenant.tenant_name,
    tenant_domain: tenant.tenant_domain,
    tenant_app_name: tenant.tenant_app_name || null,
    tenant_app_logo: tenant.tenant_app_logo || null,
    tenant_app_font: tenant.tenant_app_font || null,
    tenant_app_themes: tenant.tenant_app_themes || null,
    payment_type: tenant.payment_type,

    branches: branchData, // null if no branches
    default_branch_id,
    default_branch_name,
    default_branch_code,

    keycloak_user_id: userInfo.userId,
    displayName: userInfo.displayName,
    profile_picture: dbUser.profile_picture || null,
  };
}

const serializeBigInt = (data) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );

module.exports = { buildUserContext, serializeBigInt };
