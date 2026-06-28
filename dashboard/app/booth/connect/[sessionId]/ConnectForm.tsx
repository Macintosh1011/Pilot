"use client";

// Client component — needs Convex mutation hook and controlled form state.

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@cvx/_generated/api";
import type { Id } from "../../../types";
import { Wordmark } from "../../../components/Wordmark";
import { Spark } from "../../../components/Spark";
import styles from "./ConnectForm.module.css";

function isValidLinkedIn(url: string): boolean {
  return /linkedin\.com\/in\//i.test(url);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type FormState = "idle" | "submitting" | "done" | "error";

export function ConnectForm({ sessionId }: { sessionId: Id<"sessions"> }) {
  const captureContact = useMutation(api.sessions.captureContact);
  const [linkedin, setLinkedin] = useState("");
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const linkedinTrimmed = linkedin.trim();
  const emailTrimmed = email.trim();
  const hasLinkedIn = linkedinTrimmed.length > 0;
  const hasEmail = emailTrimmed.length > 0;
  const canSubmit = (hasLinkedIn || hasEmail) && formState === "idle";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    if (hasLinkedIn && !isValidLinkedIn(linkedinTrimmed)) {
      setErrorMsg("Enter a LinkedIn profile URL — e.g. linkedin.com/in/yourname");
      return;
    }
    if (hasEmail && !isValidEmail(emailTrimmed)) {
      setErrorMsg("Enter a valid work email address.");
      return;
    }

    setErrorMsg(null);
    setFormState("submitting");

    try {
      await captureContact({
        sessionId,
        ...(hasLinkedIn ? { linkedinUrl: linkedinTrimmed } : {}),
        ...(hasEmail ? { email: emailTrimmed } : {}),
      });
      setFormState("done");
    } catch {
      setFormState("error");
      setErrorMsg("Something went wrong — try again.");
    }
  }

  if (formState === "done") {
    return (
      <div className={styles.success} role="status">
        <Spark size={60} />
        <h1 className={styles.successHeading}>You're connected.</h1>
        <p className={styles.successBody}>
          Head back to the booth — your profile is live.
        </p>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Connect with BoothPilot"
    >
      {/* Wordmark header */}
      <div className={styles.formHeader}>
        <Wordmark size={13} color="var(--muted)" />
      </div>

      {/* Hero copy */}
      <div className={styles.hero}>
        <p className="eyebrow" style={{ margin: 0 }}>Stay in the loop</p>
        <h1 className={styles.heading}>Drop your details.</h1>
        <p className={styles.sub}>
          We'll send a follow-up based on what we talked about — no spam.
        </p>
      </div>

      {/* Fields */}
      <div className={styles.fields}>
        <label className={styles.label} htmlFor="connect-linkedin">
          <span className={styles.labelText}>LinkedIn URL</span>
          <input
            id="connect-linkedin"
            type="url"
            className={styles.input}
            placeholder="linkedin.com/in/yourname"
            value={linkedin}
            onChange={(e) => {
              setLinkedin(e.target.value);
              setErrorMsg(null);
            }}
            autoComplete="url"
            autoCapitalize="none"
            spellCheck={false}
            disabled={formState === "submitting"}
          />
        </label>

        <div className={styles.orDivider} aria-hidden="true">
          <span className={styles.orLabel}>or</span>
        </div>

        <label className={styles.label} htmlFor="connect-email">
          <span className={styles.labelText}>Work Email</span>
          <input
            id="connect-email"
            type="email"
            className={styles.input}
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMsg(null);
            }}
            autoComplete="email"
            autoCapitalize="none"
            disabled={formState === "submitting"}
          />
        </label>
      </div>

      {/* Inline error */}
      {errorMsg && (
        <p className={styles.errorMsg} role="alert">
          {errorMsg}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        className={styles.submitBtn}
        disabled={!canSubmit}
        aria-busy={formState === "submitting"}
      >
        {formState === "submitting" ? "Connecting..." : "Connect"}
      </button>

      <p className={styles.fine}>
        Your info stays with the booth team. Nothing is sold or shared.
      </p>
    </form>
  );
}
