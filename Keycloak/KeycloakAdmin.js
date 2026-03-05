// KeycloakAdmin.js
const axios = require("axios");
const qs = require("querystring");
require("dotenv").config();
const { AppError } = require("../Logics/AppError");
const { getAllBranchByTenantId } = require("../Service/BranchService");

const KEYCLOAK_BASE_URL = process.env.KEYCLOAK_BASE_URL;

// === DEBUG LOG HELPER ===
const log = (label, message, data = null) => {
  console.log(`[KeycloakAdmin] ${label}:`, message, data ? data : "");
};

// ✅ 1. Add User
async function addUser(token, realm, userData) {
  log("ADD_USER", "Starting", { realm, username: userData.username });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;

  const payload = {
    username: userData.username,
    email: userData.email || "",
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    enabled: true,
    emailVerified: true,
    attributes: {
      tenant_id: userData?.attributes?.tenant_id || "",
      clinic_id: userData?.attributes?.clinic_id || "",
      phoneNumber: userData?.attributes?.phoneNumber,
    },
    credentials: [
      {
        type: "password",
        value: userData.password || "defaultPassword123",
        temporary: false,
      },
    ],
  };

  try {
    log("ADD_USER", "Checking if user exists", { username: payload.username });
    const existingUser = await getUserIdByUsername(
      token,
      realm,
      payload.username
    );
    if (existingUser) {
      log("ADD_USER", "❌ User already exists");
      throw new AppError("Username already exists", 409);
    }

    log("ADD_USER", "Creating user in Keycloak", { payload });
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    log("ADD_USER", "✅ User created successfully", {
      username: payload.username,
    });
    return true;
  } catch (error) {
    log("ADD_USER", "❌ Error creating user", {
      message: error.response?.data || error.message,
      status: error.response?.status,
    });
    return false;
  }
}

// ✅ 2. Get User ID by Username
async function getUserIdByUsername(token, realm, username) {
  log("GET_USER_ID", "Fetching user ID", { realm, username });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.length === 0) {
      log("GET_USER_ID", "❌ No user found");
      return null;
    }

    const userId = response.data[0].id;
    log("GET_USER_ID", "✅ Found user ID", { userId });
    return userId;
  } catch (error) {
    log("GET_USER_ID", "❌ Failed to get user ID", {
      error: error.response?.data || error.message,
    });
    return null;
  }
}

// ✅ Get Full User by Username
async function getUserByUsername(token, realm, username) {
  log("GET_USER", "Fetching full user", { realm, username });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users?username=${username}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.data.length === 0) {
      log("GET_USER", "❌ User not found");
      return null;
    }

    log("GET_USER", "✅ User found", { user: response.data[0] });
    return response.data[0];
  } catch (error) {
    log("GET_USER", "❌ Failed", { error: error.message });
    return null;
  }
}

// ✅ 3. Assign Realm Role to User
async function assignRealmRoleToUser(token, realm, userId, roleName) {
  log("ASSIGN_ROLE", "Assigning role", { userId, roleName });
  const roleUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/roles/${roleName}`;
  const assignUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/role-mappings/realm`;

  try {
    const roleRes = await axios.get(roleUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const role = roleRes.data;

    await axios.post(assignUrl, [role], {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    log("ASSIGN_ROLE", `✅ Assigned role "${roleName}" to user`);
    return true;
  } catch (error) {
    log("ASSIGN_ROLE", `❌ Failed to assign role "${roleName}"`, {
      error: error.response?.data || error.message,
    });
    return false;
  }
}

// ✅ 4. Add User to Group
async function addUserToGroup(token, realm, userId, groupName) {
  log("ADD_TO_GROUP", "Adding user to group", { userId, groupName });
  const searchUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups?search=${groupName}`;
  const addUrl = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/groups`;

  try {
    const groupRes = await axios.get(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const group = groupRes.data.find((g) => g.name === groupName);

    if (!group) {
      log("ADD_TO_GROUP", `❌ Group "${groupName}" not found`);
      return false;
    }

    await axios.put(`${addUrl}/${group.id}`, null, {
      headers: { Authorization: `Bearer ${token}` },
    });

    log("ADD_TO_GROUP", `✅ Added user to group "${groupName}"`);
    return true;
  } catch (error) {
    log("ADD_TO_GROUP", `❌ Failed to add to group "${groupName}"`, {
      error: error.response?.data || error.message,
    });
    return false;
  }
}

// ✅ 5. Reset User Password
async function resetUserPassword(
  token,
  realm,
  userId,
  newPassword,
  temporary = false
) {
  log("RESET_PASSWORD", "Resetting password", { userId, temporary });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/reset-password`;

  try {
    await axios.put(
      url,
      { type: "password", value: newPassword, temporary },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    log("RESET_PASSWORD", "✅ Password reset successful");
    return true;
  } catch (error) {
    log("RESET_PASSWORD", "❌ Failed to reset password", {
      error: error.response?.data || error.message,
    });
    return false;
  }
}

// ✅ 6. Create Group in Realm
async function createGroup(token, realm, groupName, attributes = {}) {
  log("CREATE_GROUP", "Creating group", { groupName, attributes });
  const endpoint = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups`;
  const payload = { name: groupName, attributes };

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const location = response.headers.location;
    if (!location) throw new AppError("Location header missing", 400);

    const url = new URL(location);
    const pathParts = url.pathname.split("/");
    const groupId = pathParts[pathParts.length - 1];

    log("CREATE_GROUP", "✅ Group created", { groupId });
    return { groupId };
  } catch (error) {
    if (error.response?.status === 409) {
      log("CREATE_GROUP", "⚠️ Group already exists");
      return false;
    }

    log("CREATE_GROUP", "❌ Failed to create group", {
      error: error.response?.data || error.message,
    });
    return false;
  }
}

// ✅ 7. Delete User by Username
async function deleteUserByUsername(token, realm, username) {
  log("DELETE_USER_BY_USERNAME", "Deleting user", { username });
  try {
    const userId = await getUserIdByUsername(token, realm, username);
    if (!userId) {
      log("DELETE_USER_BY_USERNAME", "❌ User not found");
      return false;
    }

    const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;
    await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });

    log("DELETE_USER_BY_USERNAME", "✅ User deleted", { username, userId });
    return true;
  } catch (error) {
    log("DELETE_USER_BY_USERNAME", "❌ Failed to delete user", {
      error: error.response?.data || error.message,
    });
    return false;
  }
}

// ✅ Delete User by ID
const deleteUser = async (token, realm, userId) => {
  log("DELETE_USER_BY_ID", "Deleting user by ID", { userId });
  if (!token) throw new AppError("Authorization token is required", 400);
  if (!realm) throw new AppError("Realm is required", 400);
  if (!userId) throw new AppError("User ID is required", 400);

  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

  try {
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) {
      log("DELETE_USER_BY_ID", "✅ User deleted by ID");
      return true;
    } else {
      log("DELETE_USER_BY_ID", "⚠️ Unexpected status", {
        status: response.status,
      });
      return false;
    }
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 404) {
        log("DELETE_USER_BY_ID", "⚠️ User not found (already deleted?)");
        return false;
      }
      if (status === 403) {
        log("DELETE_USER_BY_ID", "❌ Permission denied");
        throw new AppError("Insufficient permissions to delete user", 403);
      }
      log("DELETE_USER_BY_ID", "❌ Keycloak error", { status, data });
    } else {
      log("DELETE_USER_BY_ID", "❌ Network error", { message: error.message });
    }
    throw new AppError("Failed to delete user from Keycloak", 500);
  }
};

// ✅ Update User
const updateUserInKeycloak = async (token, realm, userId, userData) => {
  // console.log(token,realm,userId,userData)
  log("UPDATE_USER", "Updating user", { userId, userData });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}`;

  try {
    const response = await axios.put(url, userData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const success = response.status === 204 || response.status === 200;
    log("UPDATE_USER", success ? "✅ Updated" : "⚠️ Unexpected status", {
      status: response.status,
    });
    return success;
  } catch (error) {
    log("UPDATE_USER", "❌ Failed", {
      error: error.response?.data || error.message,
    });
    if (error.response) {
      throw new AppError(
        `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
        404
      );
    }
  }
};

// ✅ Update Group Attributes
const updateGroupAttributes = async (token, realm, groupId, attributes) => {
  log("UPDATE_GROUP_ATTR", "Updating group attributes", {
    groupId,
    attributes,
  });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups/${groupId}`;
  await axios.put(
    url,
    { attributes },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  log("UPDATE_GROUP_ATTR", "✅ Updated");
};

// ✅ Delete Group
const deleteKeycloakGroup = async (token, realm, groupId) => {
  log("DELETE_GROUP", "Deleting group", { groupId });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups/${groupId}`;
  const response = await axios.delete(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const success = response.status === 204;
  log("DELETE_GROUP", success ? "✅ Deleted" : "❌ Failed");
  return success;
};

// ✅ Get Group ID by Name
const getGroupIdByName = async (token, realm, groupName) => {
  log("GET_GROUP_ID", "Searching group", { groupName });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/groups`;
  const response = await axios.get(url, {
    params: { search: groupName },
    headers: { Authorization: `Bearer ${token}` },
  });

  const group = response.data.find((g) => g.name === groupName);
  const id = group?.id || null;
  log("GET_GROUP_ID", id ? "✅ Found" : "❌ Not found", { id });
  return id;
};

// ✅ Get User by Email
async function getKeycloakUserIdByEmail(token, realm, email) {
  log("GET_USER_BY_EMAIL", "Fetching user by email", { email });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: { email, exact: true },
    });

    const users = response.data;
    if (users.length === 0) {
      log("GET_USER_BY_EMAIL", "❌ No user found");
      return null;
    }

    const result = { id: users[0].id, username: users[0].username };
    log("GET_USER_BY_EMAIL", "✅ Found", result);
    return result;
  } catch (error) {
    log("GET_USER_BY_EMAIL", "❌ Error", { error: error.message });
    throw new AppError("Failed to fetch Keycloak user ID", 400);
  }
}

// ✅ Get User Groups
async function getUserGroups(token, realm, userId) {
  log("GET_USER_GROUPS", "Fetching groups", { userId });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/groups`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    log("GET_USER_GROUPS", "✅ Groups fetched", {
      count: response.data.length,
    });
    return response.data;
  } catch (error) {
    log("GET_USER_GROUPS", "❌ Failed", { error: error.message });
    throw new AppError("Failed to fetch Keycloak user groups", 400);
  }
}

// ✅ Get Keycloak Token (password or client)
async function getKeycloakToken({
  method,
  username,
  password,
  KEYCLOAK_REALM = "dentalhub",
  CLIENT_ID = "mydentist.in",
}) {
  log("GET_KEYCLOAK_TOKEN", "Requesting token", {
    method,
    KEYCLOAK_REALM,
    CLIENT_ID,
  });
  const tokenUrl = `${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  let data;
  if (method === "password") {
    if (!username || !password)
      throw new AppError("Username and password required", 400);
    data = {
      grant_type: "password",
      client_id: CLIENT_ID,
      // client_secret: getClientCredential(CLIENT_ID),
      username,
      password,
    };
  } else if (method === "client_credentials") {
    data = {
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: getClientCredential(CLIENT_ID),
    };
  } else {
    throw new AppError("Invalid login method", 400);
  }

  const response = await axios.post(tokenUrl, qs.stringify(data), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  log("GET_KEYCLOAK_TOKEN", "✅ Token received (partial)", {
    access_token: response.data.access_token.substring(0, 20) + "...",
    expires_in: response.data.expires_in,
  });
  return response.data;
}

// ✅ Decode JWT (unsafe, for dev only)
function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new AppError("Invalid JWT", 400);
    const payload = parts[1];
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    log("DECODE_TOKEN", "✅ Decoded token", {
      sub: parsed.sub,
      email: parsed.email,
      roles: parsed.realm_access?.roles,
    });
    return parsed;
  } catch (err) {
    log("DECODE_TOKEN", "❌ Failed to decode", { error: err.message });
    return null;
  }
}

// ✅ Keycloak Login (password grant)
const keycloakLogin = async (username, password, realm, clientId) => {
  log("KEYCLOAK_LOGIN", "Logging in", { username, realm, clientId });
  try {
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/${realm}/protocol/openid-connect/token`,
      new URLSearchParams({
        client_id: clientId,
        grant_type: "password",
        username,
        password,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    log("KEYCLOAK_LOGIN", "✅ Login successful");
    return response.data;
  } catch (error) {
    log("KEYCLOAK_LOGIN", "❌ Login failed", {
      status: error.response?.status,
      error: error.response?.data,
    });
    throw new AppError(
      error.response?.data?.error_description || "Login failed",
      error.response?.status || 500
    );
  }
};

// ✅ Reset Password (admin)
async function resetKeycloakPassword({ userId, realm, newPassword, token }) {
  log("RESET_KEYCLOAK_PASSWORD", "Admin password reset", { userId });
  const url = `${KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/reset-password`;

  await axios.put(
    url,
    { type: "password", value: newPassword, temporary: false },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  log("RESET_KEYCLOAK_PASSWORD", "✅ Password reset by admin");
}

// ✅ Get Client Token (for testing)
async function getClientToken(client_id, client_credentials) {
  log("GET_CLIENT_TOKEN", "Getting client token", { client_id });
  try {
    const response = await axios.post(
      `${KEYCLOAK_BASE_URL}/realms/dentalhub/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: client_id,
        client_secret: client_credentials,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    log("GET_CLIENT_TOKEN", "✅ Client token received");
    return response.data.access_token;
  } catch (err) {
    log("GET_CLIENT_TOKEN", "❌ Error", {
      error: err.response?.data || err.message,
    });
  }
}

// ✅ Get Client Secret
function getClientCredential(clientId) {
  log("GET_CLIENT_CREDENTIAL", "Looking up secret for", { clientId });
  if (!clientId) throw new AppError("clientId is required", 400);

  let credentials = {};
  try {
    credentials = JSON.parse(process.env.CLIENT_CREDENTIALS || "{}");
  } catch (err) {
    throw new AppError("Invalid CLIENT_CREDENTIALS format in .env", 400);
  }

  const secret = credentials[clientId];
  if (!secret) {
    log("GET_CLIENT_CREDENTIAL", "❌ Secret not found");
    throw new AppError(
      `No client credential found for clientId: ${clientId}`,
      400
    );
  }

  log("GET_CLIENT_CREDENTIAL", "✅ Secret found (masked)", {
    clientId,
    secret: "****",
  });
  return secret;
}

async function extractUserInfo(token) {
  log("EXTRACT_USER_INFO", "Parsing token claims");

  // const tenantId = token?.tenant_id;
  const groups = token?.groups || [];

  // Extract role with priority first
  const globalRoles = token.realm_access?.roles || [];
  const ROLE_PRIORITY = ["DEV", "ADMIN", "MANAGER", "OPERATOR", "APPRAISER"];
  const role = ROLE_PRIORITY.find((r) => globalRoles.includes(r)) || "G";

  log("EXTRACT_USER_INFO", "PARSED", {
    role,
    // tenantId
  });

  return {
    username: token?.preferred_username,
    userId: token.sub,
    displayName: token.name,
    // tenantId,
    role,
  };
}

async function refreshAccessToken({
  keycloakBaseUrl, // e.g. https://keycloak.example.com
  realm, // e.g. 'myrealm'
  clientId,
  clientSecret, // optional for public clients
  refreshToken,
}) {
  const url = `${keycloakBaseUrl.replace(
    /\/$/,
    ""
  )}/realms/${realm}/protocol/openid-connect/token`;

  const data = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  };

  // if confidential client, include client_secret (or use Basic auth)
  if (clientSecret) data.client_secret = clientSecret;

  const resp = await axios.post(url, qs.stringify(data), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return resp.data; // contains access_token, refresh_token, expires_in, token_type
}

// usage
// refreshAccessToken({keycloakBaseUrl:'https://keycloak.example.com', realm:'myrealm', clientId:'app', clientSecret:'s3cret', refreshToken:'...' })

// ✅ Export All
module.exports = {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
  extractUserInfo,
  resetUserPassword,
  createGroup,
  deleteUserByUsername,
  deleteUser,
  updateUserInKeycloak,
  updateGroupAttributes,
  deleteKeycloakGroup,
  getGroupIdByName,
  getKeycloakUserIdByEmail,
  getUserGroups,
  getKeycloakToken,
  decodeToken,
  keycloakLogin,
  getUserByUsername,
  resetKeycloakPassword,
  getClientToken,
  getClientCredential,
  refreshAccessToken,
};
