import { useEffect, useRef, useState } from "react";
import "./sign-up.css";

/** Buttondown's form endpoint for the Project 2027 newsletter. */
export const SIGN_UP_URL = "https://buttondown.com/api/emails/embed-subscribe/project2027";

/**
 * Sends a sign-up form (an `email` field, plus `embed`) to Buttondown in the background, so the
 * reader stays on the page. Buttondown's reply can't be read from here (it doesn't allow it), so a
 * sent form counts as signed up; Buttondown emails them to confirm.
 *
 * `onSent` hears whether focus was in the form, since a form usually goes once it's sent.
 */
export function useSignUp(onSent?: (hadFocus: boolean) => void) {
  const [state, setState] = useState<"ready" | "sending" | "sent">("ready");
  const [failed, setFailed] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state !== "ready") return;
    const form = event.currentTarget;
    setFailed(false);
    setState("sending");
    try {
      await fetch(form.action, { method: "POST", body: new FormData(form), mode: "no-cors" });
    } catch {
      setState("ready");
      setFailed(true);
      return;
    }
    const hadFocus = form.contains(document.activeElement);
    setState("sent");
    onSent?.(hadFocus);
  };

  return { state, failed, submit };
}

/**
 * The sign-up on its own, for a written page (Contribute): an email field and a Sign up button as
 * one bar, then a thank-you in its place.
 */
export function SignUpForm() {
  const thanksRef = useRef<HTMLParagraphElement>(null);
  const [focusThanks, setFocusThanks] = useState(false);
  const { state, failed, submit } = useSignUp(setFocusThanks);

  // If focus was in the form, it moves to the thank-you that replaces it, rather than being lost.
  useEffect(() => {
    if (state === "sent" && focusThanks) thanksRef.current?.focus();
  }, [state, focusThanks]);

  return (
    <div className="sign-up not-prose">
      {state === "sent" ? (
        <p className="sign-up-thanks" ref={thanksRef} tabIndex={-1}>
          <span aria-hidden="true">✓</span> Thanks! Check your inbox to confirm.
        </p>
      ) : (
        <form action={SIGN_UP_URL} method="post" onSubmit={(event) => void submit(event)}>
          <label htmlFor="sign-up-email" className="sr-only">
            Your email
          </label>
          <div className="sign-up-bar">
            <input
              type="email"
              name="email"
              id="sign-up-email"
              required
              autoComplete="email"
              placeholder="Your email"
              readOnly={state === "sending"}
              aria-describedby={failed ? "sign-up-error" : undefined}
            />
            <input type="hidden" name="embed" value="1" />
            <button type="submit" aria-disabled={state === "sending" || undefined}>
              {state === "sending" ? "Signing up…" : "Sign up"}
            </button>
          </div>
          {failed && (
            <p className="sign-up-error" id="sign-up-error">
              That didn’t go through. Check your connection and try again.
            </p>
          )}
        </form>
      )}
      <p className="sr-only" role="status">
        {state === "sending" && "Signing you up."}
        {state === "sent" && "Thanks! Check your inbox to confirm."}
        {failed && "That didn’t go through. Check your connection and try again."}
      </p>
    </div>
  );
}
