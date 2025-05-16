export const API_BASE_URL = "http://127.0.0.1:8000/api";

export const parseErrorResponse = async (response) => {
  let errorMessage = `Error ${response.status} ${response.statusText}`;

  try {
    const errorData = await response.json();
    console.error("Error response JSON:", errorData);
    if (errorData.detail) {
      errorMessage += `: ${errorData.detail}`;
    } else if (errorData.error) {
      errorMessage += `: ${errorData.error}`;
    } else if (typeof errorData === "object") {
      errorMessage += `: ${JSON.stringify(errorData)}`;
    }
  } catch (jsonError) {
    try {
      const text = await response.text();
      console.error("Error response text (when JSON parsing failed):", text);
      errorMessage += `: ${text.substring(0, 200)}${
        text.length > 200 ? "..." : ""
      }`;
    } catch (textError) {
      console.error(
        "Failed to parse error response as JSON or text:",
        jsonError,
        textError
      );
    }
  }

  return errorMessage;
};

export const login = async (edirslug, credentials) => {
  let url = `${API_BASE_URL}/${edirslug}/auth/login/`;
  if (!edirslug) {
    edirslug = "";
    url = `${API_BASE_URL}/auth/login/`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorMsg = await parseErrorResponse(response);
    throw new Error(errorMsg);
  }

  return await response.json();
};

export const register = async (edirslug, userData) => {
  const response = await fetch(`${API_BASE_URL}/${edirslug}/members/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const errorMsg = await parseErrorResponse(response);
    throw new Error(errorMsg);
  }

  return await response.json();
};

/**
 * Fetches the list of members for a given Edir.
 * Requires an access token for authorization.
 * @param {string} edirslug - The slug of the Edir.
 * @param {string} token - The JWT access token.
 * @returns {Promise<Array|Object>} - A promise that resolves to the list of members
 *                                   (or an object containing members if pagination is used).
 * @throws {Error} - Throws an error if the request fails.
 */
export const getMembersList = async (edirslug, token) => {
  if (!token) {
    throw new Error("Authentication token is required to fetch members list.");
  }
  if (!edirslug) {
    throw new Error("Edir slug is required to fetch members list.");
  }

  const response = await fetch(`${API_BASE_URL}/${edirslug}/members/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorMsg = await parseErrorResponse(response);
    throw new Error(errorMsg);
  }

  try {
    const data = await response.json();
    // console.log('Fetched members list data:', data); // For debugging
    return data;
  } catch (e) {
    console.error("Failed to parse members list JSON:", e);
    throw new Error("Failed to parse server response for members list.");
  }
};

/**
 * Updates a member's details.
 * @param {string} edirslug - The slug of the Edir.
 * @param {string|number} memberId - The ID of the member to update.
 * @param {object} data - The data to update (e.g., { status: "approved" } or { role: "admin" }).
 * @param {string} token - The JWT access token.
 * @returns {Promise<Object>} - A promise that resolves to the updated member data.
 * @throws {Error} - Throws an error if the request fails.
 */
export const updateMember = async (edirslug, memberId, data, token) => {
  if (!token) {
    throw new Error("Authentication token is required to update member.");
  }
  if (!edirslug) {
    throw new Error("Edir slug is required to update member.");
  }
  if (!memberId) {
    throw new Error("Member ID is required to update member.");
  }

  const response = await fetch(
    `${API_BASE_URL}/${edirslug}/members/${memberId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errorMsg = await parseErrorResponse(response);
    throw new Error(errorMsg);
  }

  if (response.status === 200) {
    // No Content
    return { id: memberId, ...data };
  }

  try {
    const updatedData = await response.json();
    return updatedData;
  } catch (e) {
    console.error("Failed to parse update member response JSON:", e);
    throw new Error("Failed to parse server response after member update.");
  }
};
