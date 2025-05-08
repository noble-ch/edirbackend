import { useEdirSlug } from "../hooks/useEdirSlug";
import { RegisterForm } from "../components/auth/RegisterForm";
import { AuthLayout } from "../components/auth/AuthLayout";

export const RegisterPage = () => {
  const edirslug = useEdirSlug();

  return (
    <AuthLayout
      title="Create a new account"
      subtitle="Already have an account?"
      linkText="Sign in here"
      linkPath={`/${edirslug}/login`}
    >
      <RegisterForm edirslug={edirslug} />
    </AuthLayout>
  );
};
