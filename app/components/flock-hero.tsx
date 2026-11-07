import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Flock } from "~/lib/flock/simulation";
import { SIGN_UP_URL, useSignUp } from "./sign-up";
import { SiteHeader } from "./site-header";
import "./flock-hero.css";

/**
 * The landing hero: a flock of birds that forms the flag, the map of the US, the eagle, Lady
 * Justice and "We the People" behind the manifesto. The tuning panel shows at #tune.
 *
 * Joining sends "you" into the flock straight away, and the join button opens out across the whole
 * line, Read the plan making way, into an email field for updates from Buttondown. Once you've
 * signed up (or skipped it), the line becomes "You're in! Now read the plan!", a link to the plan.
 */
export function FlockHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const flockRef = useRef<Flock | null>(null);
  const readRef = useRef<HTMLAnchorElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const [skipped, setSkipped] = useState(false);
  // Whether focus moves to "Now read the plan!" when it comes: only if it was on what it replaces.
  const [focusNext, setFocusNext] = useState(false);
  const { state: signUpState, failed, submit: signUp } = useSignUp(setFocusNext);
  const joinState = !open
    ? "idle"
    : skipped || signUpState === "sent"
      ? "done"
      : signUpState === "sending"
        ? "sending"
        : "open";
  // The widths Join and Read the plan had when Join opened. Join grows from its own width; Read the
  // plan starts from its own and then (readGone) shrinks away, so the change animates
  // (flock-hero.css).
  const [slotBasis, setSlotBasis] = useState<number>();
  const [readBasis, setReadBasis] = useState<number>();
  const [readGone, setReadGone] = useState(false);
  // The email field takes focus as it opens, except on a phone, where the keyboard would come up over
  // the flock just as "you" flies in.
  const [focusEmail, setFocusEmail] = useState(false);

  useEffect(() => {
    if (joinState === "done" && focusNext) nextRef.current?.focus();
  }, [joinState, focusNext]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    // The simulation and its map data (~30 kB gzipped) load in their own chunk once the page is up,
    // and only in the browser.
    import("~/lib/flock/simulation")
      .then(({ startFlock }) => {
        if (!cancelled) flockRef.current = startFlock(root);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
      flockRef.current?.stop();
      flockRef.current = null;
    };
  }, []);

  const join = () => {
    if (open) return;
    // "You" leaves from the button now, before it opens out.
    void flockRef.current?.join();
    setSlotBasis(slotRef.current?.getBoundingClientRect().width);
    setReadBasis(readRef.current?.getBoundingClientRect().width);
    setFocusEmail(!window.matchMedia("(pointer: coarse)").matches);
    setOpen(true);
  };

  // Once Join opens, Read the plan goes: its width as a number is flushed to style first, so the
  // shrink has something to animate from. (Flushed rather than waiting a frame, which never comes in
  // a background tab.)
  useLayoutEffect(() => {
    if (!open || readGone) return;
    void readRef.current?.offsetWidth;
    setReadGone(true);
  }, [open, readGone]);

  const skip = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFocusNext(event.currentTarget === document.activeElement);
    setSkipped(true);
  };

  return (
    <div ref={rootRef} className="flock">
      <canvas
        id="sky"
        role="img"
        aria-label="A flock of birds gathers into the American flag, then a map of the United States, an eagle over a banner reading “E pluribus unum”, Lady Justice holding level scales, and the words “We the People”, in turn"
      />

      <div className="page">
        <SiteHeader />

        <div className="tune" id="tune-bar" hidden>
          <div className="seg" role="group" aria-label="Formation">
            <button type="button" id="mode-auto" aria-pressed="true">
              Auto
            </button>
            <button type="button" id="mode-us" aria-pressed="false">
              Form picture
            </button>
            <button type="button" id="mode-free" aria-pressed="false">
              Fly free
            </button>
          </div>
          <button type="button" className="toggle" id="stream" aria-pressed="false">
            <span className="dot" aria-hidden="true"></span>New birds joining
          </button>
          <button type="button" className="btn" id="next-pic">
            Next picture
          </button>
          <button type="button" className="btn" id="replay">
            Replay intro
          </button>
        </div>

        <main className="hero">
          <div className="copy">
            <p className="lede">
              We spend over $300 billion a year renting government software. Decades of privatization
              cost us the muscle to build our own. <em>Time to build it back.</em>
            </p>
            <h1>
              <span className="soft">No more waiting.</span>
              <br />
              The rebuild{" "}
              <span className="keep">
                starts <em>now.</em>
              </span>
            </h1>
            {joinState === "done" && !skipped && <p className="join-note">Thanks! Check your inbox to confirm.</p>}
            {(joinState === "open" || joinState === "sending") && (
              <div className="join-note">
                <label htmlFor="signup-email" className={failed ? "sr-only" : undefined}>
                  You’re in! Get email updates:
                </label>
                {failed && (
                  <span className="signup-error" id="signup-error">
                    That didn’t go through. Try again?
                  </span>
                )}
                <button type="button" className="skip" onClick={skip}>
                  Skip
                </button>
              </div>
            )}
            <div className="cta-row" data-state={joinState}>
              <Link
                className="read"
                to="/plan"
                prefetch="intent"
                ref={readRef}
                data-gone={readGone || undefined}
                style={readGone ? { flexBasis: 0 } : readBasis === undefined ? undefined : { flexBasis: readBasis }}
              >
                Read the plan
              </Link>
              {/* "You" flies out from here (#join). */}
              <div
                className="join-slot"
                id="join"
                ref={slotRef}
                style={slotBasis === undefined ? undefined : { flexBasis: slotBasis }}
              >
                {joinState === "idle" && (
                  <button type="button" className="join" onClick={join}>
                    Join the flock <span aria-hidden="true">→</span>
                  </button>
                )}
                {(joinState === "open" || joinState === "sending") && (
                  <form className="signup" action={SIGN_UP_URL} method="post" onSubmit={(event) => void signUp(event)}>
                    <input
                      type="email"
                      name="email"
                      id="signup-email"
                      required
                      autoComplete="email"
                      placeholder="Your email"
                      autoFocus={focusEmail}
                      readOnly={joinState === "sending"}
                      aria-describedby={failed ? "signup-error" : undefined}
                    />
                    <input type="hidden" name="embed" value="1" />
                    <button type="submit" className="join" aria-disabled={joinState === "sending" || undefined}>
                      {joinState === "sending" ? "Signing up…" : "Sign up"}
                    </button>
                  </form>
                )}
                {joinState === "done" && (
                  <Link className="join" to="/plan" prefetch="intent" ref={nextRef}>
                    You’re in! Now read the plan!
                  </Link>
                )}
              </div>
              <p className="sr-only" role="status">
                {joinState === "open" &&
                  (failed
                    ? "That didn’t go through. Check your connection and try again."
                    : "You’re in the flock! Enter your email for updates, or skip.")}
                {joinState === "sending" && "Signing you up."}
                {joinState === "done" &&
                  (skipped ? "You’re in! Now read the plan!" : "Thanks! Check your inbox to confirm. Now read the plan!")}
              </p>
            </div>
          </div>
        </main>

        <footer className="bottom">
          <div className="picker">
            <ShapeMenu />
            <button type="button" className="quiet" id="pause" aria-pressed="false">
              Pause motion
            </button>
          </div>
        </footer>
      </div>

      {/* "You", once you join: drawn above the copy so it shows from the moment it leaves the button. */}
      <canvas id="you-layer" aria-hidden="true" />

      <section className="panel" id="settings" aria-label="Flock settings" hidden>
        <div className="group" id="g-motion">
          <h2>Motion</h2>
        </div>
        <div className="group" id="g-map">
          <h2>The map</h2>
        </div>
        <div className="group" id="g-flock">
          <h2>Flocking</h2>
        </div>
        <div className="group" id="g-birds">
          <h2>Birds</h2>
        </div>
        <div className="group" id="g-join">
          <h2>Joining</h2>
        </div>
        <div className="actions">
          <button type="button" className="btn" id="reset-flock">
            Restart flock
          </button>
          <button type="button" className="btn" id="defaults">
            Defaults
          </button>
          <button type="button" className="btn" id="copy">
            Copy settings
          </button>
        </div>
        <p className="status" id="status" aria-live="polite"></p>
      </section>
    </div>
  );
}

const SHAPES = [
  ["flag", "Flag"],
  ["map", "Map"],
  ["eagle", "E Pluribus Unum"],
  ["justice", "Lady Justice"],
  ["people", "We the People"],
] as const;

/**
 * The picture picker: a button naming the picture the flock is drawing, which opens a menu of the
 * pictures, plus Cycle. The simulation wires up the [data-shape] buttons and keeps their pressed and
 * current states and the button's label in step; this only opens and closes the menu.
 */
function ShapeMenu() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Clicking or tabbing anywhere else closes it, and so does Escape, which hands focus back.
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("focusin", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("focusin", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const choose = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="shape-menu" ref={boxRef}>
      <button
        type="button"
        className="shape-button"
        ref={buttonRef}
        aria-expanded={open}
        aria-controls="shape-list"
        onClick={() => setOpen((was) => !was)}
      >
        <span className="sr-only">Picture: </span>
        <span id="shape-current">Flag</span>
        <svg viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 5l4-4 4 4" />
        </svg>
      </button>
      {/* Cycle starts on, with the flag drawn first. */}
      <div className="shape-list" id="shape-list" role="group" aria-label="Pictures" hidden={!open}>
        {SHAPES.map(([shape, label]) => (
          <button
            key={shape}
            type="button"
            data-shape={shape}
            aria-pressed="false"
            aria-current={shape === "flag" ? "true" : undefined}
            onClick={choose}
          >
            {label}
          </button>
        ))}
        <button type="button" data-shape="cycle" aria-pressed="true" onClick={choose}>
          Cycle
        </button>
      </div>
    </div>
  );
}
