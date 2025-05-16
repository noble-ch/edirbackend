import { useEdirSlug } from "../hooks/useEdirSlug";
import { LoginForm } from "../components/auth/LoginForm";
import { AuthLayout } from "../components/auth/AuthLayout";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const LoginPage = () => {
  const edirslug = useEdirSlug();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [inputSlug, setInputSlug] = useState("");

  const handleRegisterClick = () => {
    if (edirslug) {
      navigate(`/${edirslug}/register`);
    } else {
      setShowModal(true);
    }
  };

  const handleSubmitSlug = () => {
    if (inputSlug.trim()) {
      navigate(`/${inputSlug}/register`);
    }
  };

  return (
    <>
      <AuthLayout
        title="Sign in to your account"
        subtitle="Don't have an account?"
        linkText="Register here"
        onLinkClick={handleRegisterClick}
      >
        <LoginForm edirslug={edirslug} />
      </AuthLayout>

      {showModal && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Enter your Association ID
            </h2>
            <input
              type="text"
              value={inputSlug}
              onChange={(e) => setInputSlug(e.target.value)}
              placeholder="Edir Slug (e.g., abebachurch)"
              className="w-full p-2 border border-gray-300 rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSlug}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-800"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
