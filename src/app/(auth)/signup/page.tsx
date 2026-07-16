"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useActionState } from "react";
import { signUpAction, resendConfirmationAction, type AuthState } from "../actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmationAction, initialState);

  if (state.status === "awaiting_confirmation" || resendState.status === "awaiting_confirmation") {
    const email = resendState.email ?? state.email ?? "";
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-gold">
            <Mail className="size-5" />
            <CardTitle>Check your inbox</CardTitle>
          </div>
          <CardDescription>
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Click it to
            activate your account — you won&apos;t be able to log in until you do.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {resendState.error && <p className="text-sm text-danger">{resendState.error}</p>}
          <form action={resendAction}>
            <input type="hidden" name="email" value={email} />
            <Button type="submit" variant="outline" className="w-full" disabled={resendPending}>
              {resendPending ? "Sending…" : "Resend confirmation email"}
            </Button>
          </form>
          <Link href="/login" className="text-center text-sm text-primary hover:underline">
            Back to log in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summon your account</CardTitle>
        <CardDescription>Free forever. No credit card, ever.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" type="text" autoComplete="name" placeholder="Adventurer" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Summoning…" : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
