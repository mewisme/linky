import { SignUp } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignUp oauthFlow="popup" path="/sign-up" appearance={{
        baseTheme: dark
      }} />
    </div>
  );
}

