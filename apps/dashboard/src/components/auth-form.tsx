import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck } from "lucide-react"
import { useState } from "react"
import type { SecondFactor } from "@/lib/auth-flow"
import { SelectField } from "./select-field"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export type AuthStage =
  | "sign-in"
  | "sign-up"
  | "email-code"
  | "mfa"
  | "forgot-password"
  | "reset-code"
  | "new-password"
  | "requirements"
export type AuthValues = {
  identifier: string
  email: string
  password: string
  code: string
  firstName: string
  lastName: string
}
export const emptyAuthValues: AuthValues = {
  identifier: "",
  email: "",
  password: "",
  code: "",
  firstName: "",
  lastName: ""
}
const factorNames: Record<SecondFactor, string> = {
  totp: "Authenticator app",
  email_code: "Email code",
  phone_code: "Text message",
  backup_code: "Backup code"
}
const headings: Record<AuthStage, string> = {
  "sign-in": "Sign in to SpawnKit",
  "sign-up": "Create your account",
  "email-code": "Check your inbox",
  mfa: "Verify it's you",
  "forgot-password": "Reset your password",
  "reset-code": "Check your inbox",
  "new-password": "Choose a new password",
  requirements: "Complete your account"
}

export function AuthForm({
  stage,
  values,
  onValue,
  onSubmit,
  onSocial,
  socialProviders = ["github", "google"],
  onStage,
  onEmailCode,
  onResend,
  factor,
  factors,
  onFactor,
  missingFields,
  busy,
  ready,
  error,
  notice
}: {
  stage: AuthStage
  values: AuthValues
  onValue: (field: keyof AuthValues, value: string) => void
  onSubmit: () => void
  onSocial: (provider: "oauth_google" | "oauth_github") => void
  socialProviders?: readonly string[]
  onStage: (stage: "sign-in" | "sign-up" | "forgot-password") => void
  onEmailCode: () => void
  onResend: () => void
  factor: SecondFactor
  factors: SecondFactor[]
  onFactor: (factor: SecondFactor) => void
  missingFields: readonly string[]
  busy: boolean
  ready: boolean
  error: string
  notice: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const initial = stage === "sign-in" || stage === "sign-up"
  const verification = stage === "email-code" || stage === "mfa" || stage === "reset-code"
  const disabled = busy || !ready
  const field = (name: keyof AuthValues, label: string, type = "text", autoComplete = "off") => (
    <div className="space-y-2" key={name}>
      <Label htmlFor={`auth-${name}`} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`auth-${name}`}
          name={name}
          type={type === "password" && showPassword ? "text" : type}
          autoComplete={autoComplete}
          className={`h-11 bg-card ${type === "password" ? "pr-11" : ""}`}
          required
          disabled={disabled}
          value={values[name]}
          onChange={(event) => onValue(name, event.target.value)}
          aria-describedby={error ? "auth-error" : undefined}
          {...(name === "code" && factor !== "backup_code"
            ? { inputMode: "numeric" as const, pattern: "[0-9]{6}", maxLength: 6 }
            : {})}
        />
        {type === "password" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1.5 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  )
  return (
    <div className="auth-form w-full" aria-busy={busy}>
      <div className="mb-8">
        {verification && (
          <span className="mb-5 grid size-12 place-items-center rounded-2xl border border-primary/15 bg-accent text-primary">
            {stage === "mfa" ? <ShieldCheck /> : <Mail />}
          </span>
        )}
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[34px]">{headings[stage]}</h1>
        {verification && (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {stage === "mfa" && factor === "totp"
              ? "Enter the code from your authenticator app."
              : stage === "mfa" && factor === "backup_code"
                ? "Enter one of your saved backup codes."
                : "Enter the verification code we sent you."}
          </p>
        )}
      </div>
      {initial && socialProviders.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {socialProviders.includes("github") && (
              <Button
                type="button"
                variant="outline"
                className="h-11 bg-card"
                disabled={disabled}
                onClick={() => onSocial("oauth_github")}
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                  <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.09c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.01-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.45 3.09-1.15 3.09-1.15.62 1.55.23 2.7.12 2.98.72.78 1.15 1.78 1.15 3.01 0 4.32-2.63 5.27-5.14 5.55.4.35.77 1.03.77 2.09v3.1c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
                </svg>
                GitHub
              </Button>
            )}
            {socialProviders.includes("google") && (
              <Button
                type="button"
                variant="outline"
                className="h-11 bg-card"
                disabled={disabled}
                onClick={() => onSocial("oauth_google")}
              >
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 4.96-.9 6.61-2.42l-3.24-2.51c-.9.6-2.06.96-3.37.96-2.61 0-4.82-1.76-5.61-4.12H3.04v2.59A10 10 0 0 0 12 22Z"
                  />
                  <path fill="#FBBC05" d="M6.39 13.91a6 6 0 0 1 0-3.82V7.5H3.04a10 10 0 0 0 0 9l3.35-2.59Z" />
                  <path
                    fill="#EA4335"
                    d="M12 5.97c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z"
                  />
                </svg>
                Google
              </Button>
            )}
          </div>
          <div className="my-7 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        {(stage === "sign-in" || stage === "forgot-password") && field("identifier", "Email address", "email", "email")}
        {stage === "sign-up" && field("email", "Email address", "email", "email")}
        {(initial || stage === "new-password") &&
          field(
            "password",
            stage === "new-password" ? "New password" : "Password",
            "password",
            stage === "sign-in" ? "current-password" : "new-password"
          )}
        {stage === "requirements" && (
          <>
            {missingFields.includes("email_address") && field("email", "Email address", "email", "email")}
            {missingFields.includes("first_name") && field("firstName", "First name", "text", "given-name")}
            {missingFields.includes("last_name") && field("lastName", "Last name", "text", "family-name")}
          </>
        )}
        {stage === "mfa" && factors.length > 1 && (
          <SelectField
            label="Verification method"
            value={factor}
            onChange={(value) => onFactor(value as SecondFactor)}
            options={factors.map((value) => ({ value, label: factorNames[value] }))}
          />
        )}
        {verification &&
          field(
            "code",
            factor === "backup_code" && stage === "mfa" ? "Backup code" : "Verification code",
            "text",
            "one-time-code"
          )}
        {stage === "sign-in" && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              disabled={disabled}
              onClick={() => onStage("forgot-password")}
            >
              Forgot password?
            </Button>
          </div>
        )}
        {error && (
          <p
            id="auth-error"
            role="alert"
            className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive"
          >
            {error}
          </p>
        )}
        {notice && <output className="block text-sm text-muted-foreground">{notice}</output>}
        <Button className="h-11 w-full shadow-sm" type="submit" disabled={disabled}>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Please wait
            </>
          ) : (
            <>
              {verification
                ? "Verify and continue"
                : stage === "sign-up"
                  ? "Create account"
                  : stage === "forgot-password"
                    ? "Send reset code"
                    : stage === "new-password"
                      ? "Save password"
                      : stage === "sign-in"
                        ? "Sign in"
                        : "Continue"}
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
        <div id="clerk-captcha" />
      </form>
      {stage === "sign-in" && (
        <Button
          type="button"
          variant="ghost"
          className="mt-3 h-10 w-full text-xs text-muted-foreground"
          disabled={disabled}
          onClick={onEmailCode}
        >
          <Mail className="size-3.5" />
          Sign in with an email code
        </Button>
      )}
      {verification && !(stage === "mfa" && (factor === "totp" || factor === "backup_code")) && (
        <Button type="button" variant="link" className="mt-4 w-full text-xs" disabled={disabled} onClick={onResend}>
          Send a new code
        </Button>
      )}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        {initial ? (
          <>
            {stage === "sign-in" ? "New to SpawnKit?" : "Already have an account?"}{" "}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              disabled={disabled}
              onClick={() => onStage(stage === "sign-in" ? "sign-up" : "sign-in")}
            >
              {stage === "sign-in" ? "Create an account" : "Sign in"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            disabled={disabled}
            onClick={() => onStage("sign-in")}
          >
            <ArrowLeft className="size-3" />
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  )
}
