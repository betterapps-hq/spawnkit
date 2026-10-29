import { useClerk, useSignIn, useSignUp } from "@clerk/tanstack-react-start"
import { useEffect, useRef, useState } from "react"
import {
  authErrorMessage,
  navigateAfterAuth,
  requireAuthSuccess,
  signInStep,
  signUpStep,
  type SecondFactor
} from "@/lib/auth-flow"
import { AuthForm, emptyAuthValues, type AuthStage, type AuthValues } from "./auth-form"

export function ClerkAuth({ continueSignUp = false }: { continueSignUp?: boolean }) {
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const [stage, setStage] = useState<AuthStage>(continueSignUp ? "requirements" : "sign-in")
  const [values, setValues] = useState<AuthValues>(emptyAuthValues)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [factor, setFactor] = useState<SecondFactor>("email_code")
  const [availableFactors, setAvailableFactors] = useState<SecondFactor[]>([])
  const [signupCode, setSignupCode] = useState(continueSignUp)
  const initialized = useRef(false)
  const inFlight = useRef(false)

  async function run(operation: () => Promise<void>) {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await operation()
    } catch (failure) {
      setError(authErrorMessage(failure))
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  async function prepareFactor(next: SecondFactor) {
    if (!signIn) return
    if (next === "email_code") await requireAuthSuccess(signIn.mfa.sendEmailCode())
    if (next === "phone_code") await requireAuthSuccess(signIn.mfa.sendPhoneCode())
    setFactor(next)
    setValues((current) => ({ ...current, code: "", password: "" }))
    setStage("mfa")
  }
  async function advanceSignIn() {
    if (!signIn) return
    const next = signInStep(signIn)
    if (next.step === "complete") await requireAuthSuccess(signIn.finalize({ navigate: navigateAfterAuth }))
    else if (next.step === "mfa") {
      setAvailableFactors(next.factors)
      await prepareFactor(next.factors[0]!)
    } else if (next.step === "new-password") setStage("new-password")
    else setError("This sign-in needs another verification method. Please try a different sign-in option.")
  }
  async function advanceSignUp() {
    if (!signUp) return
    const next = signUpStep(signUp)
    if (next === "complete") await requireAuthSuccess(signUp.finalize({ navigate: navigateAfterAuth }))
    else if (next === "requirements") setStage("requirements")
    else if (next === "email-code") {
      await requireAuthSuccess(signUp.verifications.sendEmailCode())
      setSignupCode(true)
      setValues((current) => ({ ...current, password: "", code: "" }))
      setStage("email-code")
    } else setError("Your account needs another verification step. Please use a different sign-in option.")
  }
  useEffect(() => {
    if (!clerk.loaded || !signIn || !signUp || initialized.current) return
    initialized.current = true
    if (clerk.session?.currentTask) {
      window.location.assign("/session-tasks")
      return
    }
    if (continueSignUp && signUp.id) void run(advanceSignUp)
    else if (
      signIn.status === "needs_second_factor" ||
      signIn.status === "needs_client_trust" ||
      signIn.status === "complete" ||
      signIn.status === "needs_new_password"
    )
      void run(advanceSignIn)
    // Initial callback recovery only; subsequent steps run in the submitting event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerk.loaded, signIn, signUp, continueSignUp])

  async function submit() {
    if (!signIn || !signUp) return
    if (stage === "sign-in") {
      await requireAuthSuccess(signIn.password({ identifier: values.identifier.trim(), password: values.password }))
      await advanceSignIn()
    } else if (stage === "sign-up") {
      await requireAuthSuccess(
        signUp.password({
          emailAddress: values.email.trim(),
          password: values.password
        })
      )
      await advanceSignUp()
    } else if (stage === "requirements") {
      const missing = signUp.missingFields
      if (missing.some((field) => !["email_address", "first_name", "last_name"].includes(field))) {
        setError("Your account needs an additional setup method. Please return to sign in and choose another option.")
        return
      }
      await requireAuthSuccess(
        signUp.update({
          ...(missing.includes("email_address") ? { emailAddress: values.email.trim() } : {}),
          ...(missing.includes("first_name") ? { firstName: values.firstName.trim() } : {}),
          ...(missing.includes("last_name") ? { lastName: values.lastName.trim() } : {})
        })
      )
      await advanceSignUp()
    } else if (stage === "email-code") {
      if (signupCode) {
        await requireAuthSuccess(signUp.verifications.verifyEmailCode({ code: values.code.trim() }))
        // Failed or incomplete verification must never activate a session.
        if (signUp.status === "complete") await requireAuthSuccess(signUp.finalize({ navigate: navigateAfterAuth }))
        else if (signUp.missingFields.length) setStage("requirements")
        else setError("Email verification is not complete. Please try again.")
      } else {
        await requireAuthSuccess(signIn.emailCode.verifyCode({ code: values.code.trim() }))
        await advanceSignIn()
      }
    } else if (stage === "mfa") {
      const verify = {
        totp: signIn.mfa.verifyTOTP,
        email_code: signIn.mfa.verifyEmailCode,
        phone_code: signIn.mfa.verifyPhoneCode,
        backup_code: signIn.mfa.verifyBackupCode
      }[factor]
      await requireAuthSuccess(verify({ code: values.code.trim() }))
      await advanceSignIn()
    } else if (stage === "forgot-password") {
      await requireAuthSuccess(signIn.create({ identifier: values.identifier.trim() }))
      await requireAuthSuccess(signIn.resetPasswordEmailCode.sendCode())
      setStage("reset-code")
    } else if (stage === "reset-code") {
      await requireAuthSuccess(signIn.resetPasswordEmailCode.verifyCode({ code: values.code.trim() }))
      if (signIn.status === "needs_new_password") {
        setValues((current) => ({ ...current, password: "", code: "" }))
        setStage("new-password")
      } else setError("Password reset verification is not complete. Please try again.")
    } else if (stage === "new-password") {
      await requireAuthSuccess(signIn.resetPasswordEmailCode.submitPassword({ password: values.password }))
      await advanceSignIn()
    }
  }
  return (
    <AuthForm
      socialProviders={(import.meta.env.VITE_SPAWN_SOCIAL_PROVIDERS ?? "github,google").split(",").filter(Boolean)}
      stage={stage}
      values={values}
      onValue={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
      onSubmit={() => void run(submit)}
      busy={busy}
      ready={clerk.loaded && Boolean(signIn && signUp)}
      error={error}
      notice={notice}
      factor={factor}
      factors={availableFactors}
      missingFields={signUp?.missingFields ?? []}
      onFactor={(next) => void run(() => prepareFactor(next))}
      onSocial={(strategy) =>
        void run(async () => {
          if (!signIn || !clerk.client) return
          // A previous password attempt can have no OAuth redirect to resume.
          await requireAuthSuccess(signIn.reset())
          // Read the replacement resource after reset, rather than the stale hook instance.
          await clerk.client.signIn.authenticateWithRedirect({
            strategy,
            redirectUrl: new URL("/sso-callback", window.location.origin).href,
            redirectUrlComplete: new URL("/session-tasks", window.location.origin).href
          })
        })
      }
      onStage={(next) =>
        void run(async () => {
          if (!signIn || !signUp) return
          await requireAuthSuccess(signIn.reset())
          await requireAuthSuccess(signUp.reset())
          setValues((current) => ({ ...current, password: "", code: "" }))
          setSignupCode(false)
          setStage(next)
        })
      }
      onEmailCode={() =>
        void run(async () => {
          if (!signIn) return
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.identifier.trim())) {
            setError("Enter your email address to receive a sign-in code.")
            return
          }
          await requireAuthSuccess(signIn.emailCode.sendCode({ emailAddress: values.identifier.trim() }))
          setSignupCode(false)
          setValues((current) => ({ ...current, password: "", code: "" }))
          setStage("email-code")
        })
      }
      onResend={() =>
        void run(async () => {
          if (!signIn || !signUp) return
          if (stage === "reset-code") await requireAuthSuccess(signIn.resetPasswordEmailCode.sendCode())
          else if (stage === "mfa") await prepareFactor(factor)
          else if (signupCode) await requireAuthSuccess(signUp.verifications.sendEmailCode())
          else await requireAuthSuccess(signIn.emailCode.sendCode())
          setNotice("A new code has been sent.")
        })
      }
    />
  )
}
