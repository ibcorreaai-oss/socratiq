"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useActionState } from "react";
import { logInAction, resendConfirmationAction, type AuthState } from "../actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(logInAction, initialState);
  const [resendState, resendAction, resendPending] = useActionState(resendConfirmationAction, initialState);

  const unconfirmed = state.status === "unconfirmed_login_attempt";
  const resent = resendState.status === "awaiting_confirmation";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back, adventurer</CardTitle>
        <CardDescription>Log in to continue your quests.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>

        {unconfirmed && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gold">
              <Mail className="size-4" /> Email not confirmed yet
            </div>
            <p className="text-sm text-muted">
              We sent a confirmation link to <span className="text-foreground">{state.email}</span> when you
              signed up. Find it in your inbox and click it, or resend it below.
            </p>
            {resent ? (
              <p className="text-sm text-success">Sent — check your inbox again.</p>
            ) : (
              <form action={resendAction}>
                <input type="hidden" name="email" value={state.email} />
                {resendState.error && <p className="mb-2 text-sm text-danger">{resendState.error}</p>}
                <Button type="submit" variant="outline" size="sm" className="w-full" disabled={resendPending}>
                  {resendPending ? "Sending…" : "Resend confirmation email"}
                </Button>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
