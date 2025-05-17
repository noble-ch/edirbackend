const BASE_URL = "http://127.0.0.1:8000/api";

const logRequest = (method, endpoint, data = null) => {
  console.groupCollapsed(`API ${method}: ${endpoint}`);
  console.log('Request:', { method, endpoint, data });
  return (response, responseData) => {
    console.log('Response:', { 
      status: response.status, 
      statusText: response.statusText,
      data: responseData 
    });
    console.groupEnd();
  };
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data;
  
  try {
    data = contentType?.includes('application/json') 
      ? await response.json() 
      : await response.text();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.detail || data?.message || response.statusText);
    error.status = response.status;
    error.data = data;
    console.error('Full error response:', data); // Add this line
    throw error;
  }

  return data;
};
export const api = {
  get: async (endpoint) => {
    const token = localStorage.getItem("accessToken");
    const endLog = logRequest('GET', endpoint);
    
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await handleResponse(response);
      endLog(response, data);
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  post: async (endpoint, data) => {
    const token = localStorage.getItem("accessToken");
    const endLog = logRequest('POST', endpoint, data);
    
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const responseData = await handleResponse(response);
      endLog(response, responseData);
      return responseData;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  patch: async (endpoint, data) => {
    const token = localStorage.getItem("accessToken");
    const endLog = logRequest('PATCH', endpoint, data);
    
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const responseData = await handleResponse(response);
      endLog(response, responseData);
      return responseData;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  delete: async (endpoint) => {
    const token = localStorage.getItem("accessToken");
    const endLog = logRequest('DELETE', endpoint);
    
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const responseData = await handleResponse(response);
      endLog(response, responseData);
      return responseData;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
};