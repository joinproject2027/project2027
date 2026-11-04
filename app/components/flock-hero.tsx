import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Flock } from "~/lib/flock/simulation";
import { SiteHeader } from "./site-header";
import "./flock-hero.css";

/**
 * The landing hero: a flock of birds that forms the flag, the map of the US, the eagle, Lady
 * Justice and "We the People" behind the manifesto. The tuning panel shows at #tune.
 *
 * Joining sends "you" into the flock; once it's in, the join button points the reader on to the
 * plan, beside it.
 */
export function FlockHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const flockRef = useRef<Flock | null>(null);
  const [joinState, setJoinState] = useState<"idle" | "joining" | "joined">("idle");

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
    if (joinState !== "idle") return;
    setJoinState("joining");
    void (flockRef.current?.join() ?? Promise.resolve()).then(() => setJoinState("joined"));
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
            <div className="cta-row">
              <Link className="read" to="/plan" prefetch="intent">
                Read the plan
              </Link>
              <button
                type="button"
                className="join"
                id="join"
                onClick={join}
                data-state={joinState}
                aria-disabled={joinState !== "idle" || undefined}
              >
                {joinState === "idle" && (
                  <>
                    Join the flock <span aria-hidden="true">→</span>
                  </>
                )}
                {joinState === "joining" && "Joining the flock…"}
                {joinState === "joined" && (
                  <>
                    {/* Points at Read the plan: left of it, or above it once the buttons stack. */}
                    <span className="point" aria-hidden="true">
                      ←
                    </span>
                    You’re in! Now read the plan!
                  </>
                )}
              </button>
              <p className="sr-only" role="status">
                {joinState === "joining" && "Joining the flock."}
                {joinState === "joined" && "You’re in! Now read the plan."}
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
