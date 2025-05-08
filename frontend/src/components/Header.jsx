import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

function Header() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const [userEdir, setUserEdir] = useState();

  const userDropdownRef = useRef(null);
  const authDropdownRef = useRef(null);
  // Check localStorage for user on initial mount
  useEffect(() => {
    let usersEdir;

    try {
      const storedUser = localStorage.getItem("user");
      const access = localStorage.getItem("accessToken");
      setAccessToken(access);

      usersEdir = storedUser ? JSON.parse(storedUser).edir?.slug : null;
      setUserEdir(usersEdir);
      console.log("aaa", usersEdir);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    setIsUserDropdownOpen(false);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target)
      ) {
        setIsUserDropdownOpen(false);
      }
      if (
        authDropdownRef.current &&
        !authDropdownRef.current.contains(event.target)
      ) {
        setIsAuthDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="flex justify-between items-center p-4 bg-gray-100 shadow-md">
      <div className="header-logo text-xl font-bold">Edir Platform</div>
      <nav className="flex space-x-4 items-center">
        <a href="#home" className="header-link hover:text-blue-600">
          Home
        </a>
        <a href="#about" className="header-link hover:text-blue-600">
          About
        </a>
        <a href="#contact" className="header-link hover:text-blue-600">
          Contact
        </a>

        {accessToken ? (
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center header-link bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none"
            >
              {user.name ? user.name.split(" ")[0] : "Profile"}
              <svg
                className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                  isUserDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                <a
                  href="#profile/manage"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={() => setIsUserDropdownOpen(false)}
                >
                  Manage Profile
                </a>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative" ref={authDropdownRef}>
            <button
              onClick={() => setIsAuthDropdownOpen(!isAuthDropdownOpen)}
              className="flex items-center header-link bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 focus:outline-none"
            >
              Get Started
              <svg
                className={`w-4 h-4 ml-2 transition-transform duration-200 ${
                  isAuthDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                ></path>
              </svg>
            </button>
            {isAuthDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                <Link
                  to={`${userEdir}/login`}
                  onClick={() => setIsAuthDropdownOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Login
                </Link>

                <a
                  href="register"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  onClick={() => setIsAuthDropdownOpen(false)}
                >
                  Register
                </a>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;
