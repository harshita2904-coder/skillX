// API utility function with proper CORS settings
export const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    credentials: 'include', // This is equivalent to withCredentials: true
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  return fetch(url, finalOptions);
};

// Convenience methods
export const apiGet = (url, options = {}) => 
  apiRequest(url, { ...options, method: 'GET' });

export const apiPost = (url, data, options = {}) => 
  apiRequest(url, { 
    ...options, 
    method: 'POST', 
    body: JSON.stringify(data) 
  });

export const apiPut = (url, data, options = {}) => 
  apiRequest(url, { 
    ...options, 
    method: 'PUT', 
    body: JSON.stringify(data) 
  });

export const apiPatch = (url, data, options = {}) => 
  apiRequest(url, { 
    ...options, 
    method: 'PATCH', 
    body: JSON.stringify(data) 
  });

export const apiDelete = (url, options = {}) => 
  apiRequest(url, { ...options, method: 'DELETE' }); 