import { Link } from "react-router";
import { ThemeToggle } from "./theme-toggle";
import "./site-header.css";

/** The plan is the site's one page of writing, so the nav is the plan, the way to help with it, and who's behind it. */
export function SiteHeader() {
  return (
    <header className="top">
      <Link className="mark" to="/">
        Project 2027
      </Link>
      <nav className="primary" aria-label="Primary">
        {/* Just "Read" on phones (site-header.css); screen readers still hear the whole name. The
            label is one span so its space survives: the link is a flex box, and a flex item drops
            leading spaces. */}
        <Link to="/plan">
          <span>
            Read<span className="nav-more"> the Plan</span>
          </span>
        </Link>
        <ThemeToggle />
        <Link to="/contribute">Contribute</Link>
        <Link to="/about">About</Link>
      </nav>
    </header>
  );
}
