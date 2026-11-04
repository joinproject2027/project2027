import { useEffect, useRef, useState } from "react";
import { InPageLink } from "./citations";
import "./table-of-contents.css";

/** A heading, as plugins/rehype-toc.ts exports them. */
export interface TocEntry {
  depth: number;
  id: string;
  text: string;
}

/** A place in the page to link to. */
export interface TocLink {
  id: string;
  text: string;
}

/** A top-level entry, with the entries under it. */
export interface TocSection extends TocLink {
  children: TocLink[];
}

/** How far below the top of the window a heading has to scroll before its section counts as current. */
const CURRENT_LINE = 120;

/** Sections from a page's headings: each <h2>, with the <h3>s after it as its children. */
export function nestHeadings(entries: TocEntry[]): TocSection[] {
  const sections: TocSection[] = [];
  let sectionDepth = Infinity;
  for (const { depth, id, text } of entries) {
    const parent = sections.at(-1);
    if (parent && depth > sectionDepth) {
      parent.children.push({ id, text });
    } else {
      sections.push({ id, text, children: [] });
      sectionDepth = depth;
    }
  }
  return sections;
}

/** Every place the sections link to, in page order. */
function linkedIds(sections: TocSection[]) {
  return [...new Set(sections.flatMap((section) => [section.id, ...section.children.map((child) => child.id)]))];
}

/** The id of the last heading scrolled past, or of the last one once the page is scrolled to the end. */
function currentId(ids: string[]) {
  const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atEnd) return ids.at(-1);
  let current = ids[0];
  for (const id of ids) {
    const heading = document.getElementById(id);
    if (!heading || heading.getBoundingClientRect().top > CURRENT_LINE) break;
    current = id;
  }
  return current;
}

/** Scrolls the list just enough to show its current link, if the list is taller than its box. */
function revealCurrent(list: HTMLElement) {
  const link = list.querySelector<HTMLElement>('[aria-current="location"]');
  if (!link || list.scrollHeight <= list.clientHeight) return;
  const margin = 24;
  if (link.offsetTop - margin < list.scrollTop) {
    list.scrollTop = link.offsetTop - margin;
  } else if (link.offsetTop + link.offsetHeight + margin > list.scrollTop + list.clientHeight) {
    list.scrollTop = link.offsetTop + link.offsetHeight + margin - list.clientHeight;
  }
}

/**
 * A page's sections, with the one being read marked. Only the current section shows the entries
 * under it; the others fold away, and open as the reader scrolls into them. Wide screens show the
 * list beside the text (placed by the page); narrow ones show a bar naming the current section,
 * which opens the list.
 */
export function TableOfContents({ sections }: { sections: TocSection[] }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(sections[0]?.id);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // Follow the reader's place in the page.
  useEffect(() => {
    const ids = linkedIds(sections);
    let frame = 0;
    const update = () => {
      frame = 0;
      setActiveId(currentId(ids));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [sections]);

  // Keep the current link in view, again once a section has finished opening or closing.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    revealCurrent(list);
    const onTransitionEnd = () => revealCurrent(list);
    list.addEventListener("transitionend", onTransitionEnd);
    return () => list.removeEventListener("transitionend", onTransitionEnd);
  }, [activeId, open]);

  // An open list closes on Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const activeChild = sections.flatMap((section) => section.children).find((child) => child.id === activeId);
  const activeSection = sections.find(
    (section) => section.id === activeId || section.children.some((child) => child.id === activeId),
  );
  // A section and its first entry can share a heading; the entry is the one marked.
  const currentLink = activeChild ?? activeSection;

  const link = (target: TocLink) => (
    <InPageLink
      href={`#${target.id}`}
      aria-current={target === currentLink ? "location" : undefined}
      onClick={() => setOpen(false)}
    >
      {target.text}
    </InPageLink>
  );

  return (
    <nav ref={navRef} className="toc" aria-label="Table of contents" data-open={open || undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="toc-toggle"
        aria-expanded={open}
        aria-controls="toc-list"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <span className="toc-label">Contents</span>
        <span className="toc-current">{currentLink?.text}</span>
        <svg className="toc-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <p className="toc-title" aria-hidden="true">
        Contents
      </p>
      <ol id="toc-list" ref={listRef} className="toc-list">
        {sections.map((section) => {
          const current = section === activeSection;
          return (
            <li key={`${section.id}:${section.text}`} data-current={current || undefined}>
              {link(section)}
              {section.children.length > 0 && (
                // Folded sections stay in the page so they can animate open, but out of reach.
                <div className="toc-children" inert={!current}>
                  <ol>
                    {section.children.map((child) => (
                      <li key={`${child.id}:${child.text}`}>{link(child)}</li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
