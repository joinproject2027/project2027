import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render as renderInBrowser } from "vitest-browser-react";
import Home from "./home";

/** Render the home page inside a router, since it links with <Link>, with a stand-in for the plan. */
function render(page: React.ReactElement) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => page },
    { path: "/plan", Component: () => <p>The plan page</p> },
  ]);
  return renderInBrowser(<Stub initialEntries={["/"]} />);
}

/** How many pixels of the canvas have something drawn on them. */
function painted(canvas: HTMLCanvasElement | null) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return 0;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
  return n;
}

test("home page shows the headline, a link to the plan, and the join button", async () => {
  const screen = await render(<Home />);

  await expect
    .element(screen.getByRole("heading", { level: 1, name: /No more waiting\.\s*The rebuild starts now\./ }))
    .toBeInTheDocument();
  const main = screen.getByRole("main");
  await expect.element(main.getByRole("link", { name: "Read the plan" })).toHaveAttribute("href", "/plan");
  await expect.element(main.getByRole("button", { name: "Join the flock" })).toBeInTheDocument();
});

test("joining sends you into the flock, then points you to the plan", async () => {
  localStorage.clear();
  const screen = await render(<Home />);
  const canvas = screen.container.querySelector<HTMLCanvasElement>("canvas");
  await expect.poll(() => painted(canvas)).toBeGreaterThan(0);

  const join = screen.getByRole("button", { name: "Join the flock" });
  await join.click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("Joining the flock.");
  await expect.element(screen.getByRole("status"), { timeout: 6000 }).toHaveTextContent("You’re in! Now read the plan.");
  await expect.element(screen.getByRole("button", { name: "You’re in! Now read the plan!" })).toBeInTheDocument();
  // It stays on the page: reading the plan is up to the reader.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(screen.getByText("The plan page").elements()).toHaveLength(0);
});

test("the flock draws, cycles by default, and holds a picked picture", async () => {
  localStorage.clear();
  const screen = await render(<Home />);

  // The simulation loads after the page; once it runs, the canvas has birds on it.
  const canvas = screen.container.querySelector<HTMLCanvasElement>("canvas");
  await expect.poll(() => painted(canvas)).toBeGreaterThan(0);

  // The picker is one button naming the picture; it opens a menu of them.
  const picker = screen.getByRole("button", { name: /^Picture:/ });
  await expect.element(picker).toHaveAccessibleName("Picture: Flag");
  await expect.element(picker).toHaveAttribute("aria-expanded", "false");
  await picker.click();
  await expect.element(picker).toHaveAttribute("aria-expanded", "true");

  const cycle = screen.getByRole("button", { name: "Cycle" });
  const flag = screen.getByRole("button", { name: "Flag", exact: true });
  const map = screen.getByRole("button", { name: "Map" });
  await expect.element(cycle).toHaveAttribute("aria-pressed", "true");
  await expect.element(flag).toHaveAttribute("aria-current", "true");

  // Picking one holds it, names it on the button, and closes the menu.
  await map.click();
  await expect.element(picker).toHaveAttribute("aria-expanded", "false");
  await expect.element(picker).toHaveAccessibleName("Picture: Map");

  await picker.click();
  await expect.element(cycle).toHaveAttribute("aria-pressed", "false");
  await expect.element(map).toHaveAttribute("aria-pressed", "true");
  await expect.element(map).toHaveAttribute("aria-current", "true");
  await expect.element(flag).not.toHaveAttribute("aria-current");

  // Escape closes it again.
  await userEvent.keyboard("{Escape}");
  await expect.element(picker).toHaveAttribute("aria-expanded", "false");
});
