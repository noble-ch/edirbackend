import { useEdirSlug } from "../hooks/useEdirSlug";
import { LoginForm } from "../components/auth/LoginForm";
import { AuthLayout } from "../components/auth/AuthLayout";

export const LoginPage = () => {
  const edirslug = useEdirSlug();

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle="Don't have an account?"
      linkText="Register here"
      linkPath={`/${edirslug}/register`}
    >
      <LoginForm edirslug={edirslug} />
    </AuthLayout>
  );
};
