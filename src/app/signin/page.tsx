import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign in — Dashu" };

export default function SignInPage() {
  return (
    <Suspense>
      <AuthForm mode="signin" />
    </Suspense>
  );
}
