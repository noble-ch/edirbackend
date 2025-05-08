import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';

// Helper object to map roles from API to URL path segments
const ROLE_TO_PATH_SEGMENT = {
  'TREASURER': 'treasurer',
  'PROPERTY_MANAGER': 'propertymanager',
  'COORDINATOR': 'eventcoordinator',
  'MEMBER': 'member', 
};

export const LoginForm = ({ edirslug }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await login(edirslug, credentials);

      // Store tokens
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('refreshToken', data.refresh);

      // Store user information
      const user = {
        username: data.username,
        email: data.email,
        edir: data.edir, // edir: { id, name, slug }
        role: data.role, // e.g., ["MEMBER"], ["TREASURER"]
        is_edir_head: data.is_edir_head,
        verification_status: data.verification_status,
      };
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Primary role from API:', user.role);
      console.log('User data:', user);
      // Redirection logic
      if (user.verification_status === 'pending') {
        navigate('/pending-approval'); 
      } else if (user.is_edir_head) {
        navigate(`/${edirslug}/head/dashboard`);
      } else {
        let dashboardPath = `/${edirslug}/member/dashboard`; 

        if (user.role && user.role.length > 0) {
          const primaryRoleFromAPI = user.role.toUpperCase();
          if (ROLE_TO_PATH_SEGMENT[primaryRoleFromAPI]) {
            dashboardPath = `/${edirslug}/${ROLE_TO_PATH_SEGMENT[primaryRoleFromAPI]}/dashboard`;
          }
        }
        navigate(dashboardPath);
      }
    } catch (err) {
      setError(err.message);

      console.error('Login component error:', err); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={credentials.username}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </form>
  );
};