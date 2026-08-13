import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Create an account — Dashu" };

export default function SignUpPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
