const { default: axios } = require("axios");

async function createUser(req) {
  try {
    const { email, first_name, last_name, username, password } = req.body;
    const token = req.cookies.access_token;
    const realm = req.cookies.realm;

    await axios.post(
      `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users`,
      {
        username,
        email,
        firstName: first_name,
        lastName: last_name,
        enabled: true,
        emailVerified: true,
        credentials: [
          {
            type: "password",
            value: password,
            temporary: false,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`User "${username}" created successfully.`);

    const user = await getUserId(token, realm, username);
    // console.log('user:',user)

    await assignRealmRole(user?.id, req.body.role, token,realm);
    return user;
  } catch (error) {
    console.error(
      "Error creating user:",
      error.response?.data || error.message
    );
  }
}

async function setUserPassword(token, realmName, username, password) {
  try {
    // Get user ID first
    const response = await axios.get(
      `http://localhost:8080/admin/realms/${realmName}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { username },
      }
    );

    const user = response.data.find((u) => u.username === username);
    if (!user) throw new Error(`User "${username}" not found.`);

    // Set password
    await axios.put(
      `http://localhost:8080/admin/realms/${realmName}/users/${user.id}/reset-password`,
      {
        type: "password",
        value: password,
        temporary: false, // Set to true if you want the user to reset their password on first login
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    //console.log(`Password set successfully for user "${username}".`);
  } catch (error) {
    console.error(
      "Error setting password:",
      error.response?.data || error.message
    );
  }
}

async function getUserId(token, realmName, username) {
  username = username.toLowerCase();
  try {
    const response = await axios.get(
      `http://localhost:8080/admin/realms/${realmName}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { username },
      }
    );

    const user = response.data.find((u) => u.username === username);
    if (!user) throw new Error(`User "${username}" not found.`);

    return user;
  } catch (error) {
    console.error(
      "Error fetching user ID:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function assignRealmRole(userId, roleName, token,realm) {
  // roleName = roleName.toLowerCase();
  // Get role object
  const roleRes = await axios.get(
    `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/roles/${roleName}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const roleObj = roleRes.data;

  // Assign role
  await axios.post(
    `${process.env.KEYCLOAK_BASE_URL}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
    [roleObj],
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return true;
}

module.exports = { createUser, setUserPassword, getUserId, assignRealmRole };

// // Example Usage: Set password for "john.doe"
// setUserPassword("my-realm", "john.doe", "SecurePassword123");

// // Example Usage: Create user "john.doe"
// createUser("my-realm", "john.doe", "john.doe@example.com", "John", "Doe");
