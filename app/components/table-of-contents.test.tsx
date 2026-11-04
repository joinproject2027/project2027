import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render as renderInBrowser } from "vitest-browser-react";
import { nestHeadings, TableOfContents, type TocSection } from "./table-of-contents";

// Shaped like the plan's: a section led by the introduction, which shares its section's heading.
const sections: TocSection[] = [
  {
    id: "intro",
    text: "The plan",
    children: [
      { id: "intro", text: "Introduction" },
      { id: "build", text: "Phase 1: Build" },
      { id: "share", text: "Phase 2: Share" },
    ],
  },
  { id: "faq", text: "FAQ", children: [{ id: "security", text: "Security?" }] },
  { id: "sources", text: "Sources", children: [] },
];
const headings = ["intro", "build", "share", "faq", "security", "sources"];

/** Render inside a router, since the contents link with <Link>. */
function render(page: React.ReactElement) {
  const Stub = createRoutesStub([{ path: "/", Component: () => page }]);
  return renderInBrowser(<Stub initialEntries={["/"]} />);
}

/** The contents beside tall sections, so there's something to scroll through. */
function Page() {
  return (
    <>
      <TableOfContents sections={sections} />
      {headings.map((id) => (
        <section key={id} style={{ height: "150vh" }}>
          <h2 id={id}>{id}</h2>
        </section>
      ))}
    </>
  );
}

test("nestHeadings puts each h3 under the h2 before it", () => {
  expect(
    nestHeadings([
      { depth: 2, id: "faq", text: "FAQ" },
      { depth: 3, id: "security", text: "Security?" },
      { depth: 3, id: "compliance", text: "Compliance?" },
      { depth: 2, id: "sources", text: "Sources" },
    ]),
  ).toEqual([
    {
      id: "faq",
      text: "FAQ",
      children: [
        { id: "security", text: "Security?" },
        { id: "compliance", text: "Compliance?" },
      ],
    },
    { id: "sources", text: "Sources", children: [] },
  ]);
});

// The test viewport is phone-sized, so the contents start as a closed bar.
test("the bar opens the list, and following a link closes it", async () => {
  const screen = await render(<Page />);
  const toggle = screen.getByRole("button", { name: /Contents/ });
  const link = screen.getByRole("link", { name: "Phase 2: Share" });

  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await expect.element(screen.container.querySelector<HTMLElement>(".toc-list")).not.toBeVisible();

  await toggle.click();
  await expect.element(toggle).toHaveAttribute("aria-expanded", "true");
  await expect.element(link).toBeVisible();

  await link.click();
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
});

test("Escape closes the list and returns focus to the bar", async () => {
  const screen = await render(<Page />);
  const toggle = screen.getByRole("button", { name: /Contents/ });

  await toggle.click();
  await userEvent.keyboard("{Escape}");
  await expect.element(toggle).toHaveAttribute("aria-expanded", "false");
  await expect.element(toggle).toHaveFocus();
});

test("only the section being read is unfolded, and it follows scrolling", async () => {
  window.scrollTo(0, 0);
  const screen = await render(<Page />);
  await expect.element(screen.getByRole("button", { name: /Contents/ })).toBeInTheDocument();
  // The closed list is hidden, so find things by selector rather than by role.
  const find = (selector: string) => screen.container.querySelector<HTMLElement>(selector);
  const [planSection, faqSection] = screen.container.querySelectorAll<HTMLElement>(".toc-list > li");
  const children = (section: HTMLElement) => section.querySelector<HTMLElement>(".toc-children");

  // At the top, the introduction is marked rather than the section it leads.
  await expect.element(find('.toc-children a[href$="#intro"]')).toHaveAttribute("aria-current", "location");
  await expect.element(find('.toc-list > li > a[href$="#intro"]')).not.toHaveAttribute("aria-current");
  await expect.element(planSection).toHaveAttribute("data-current");
  await expect.element(children(faqSection)).toHaveAttribute("inert");

  document.getElementById("security")!.scrollIntoView();
  await expect.element(find('a[href$="#security"]')).toHaveAttribute("aria-current", "location");
  await expect.element(faqSection).toHaveAttribute("data-current");
  await expect.element(children(faqSection)).not.toHaveAttribute("inert");
  await expect.element(planSection).not.toHaveAttribute("data-current");
  await expect.element(children(planSection)).toHaveAttribute("inert");
  await expect.element(find(".toc-current")).toHaveTextContent("Security?");
});
