import { createRoutesStub } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render as renderInBrowser } from "vitest-browser-react";
import { SIGN_UP_URL } from "~/components/sign-up";
import Home from "./home";

/** Render the home page inside a router, since it links with <Link>, with a stand-in for the plan. */
function render(page: React.ReactElement) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => page },
    { path: "/plan", Component: () => <p>The plan page</p> },
  ]);
  return renderInBrowser(<Stub initialEntries={["/"]} />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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
  // The email field only comes once you join.
  expect(main.getByRole("textbox").elements()).toHaveLength(0);
});

test("joining sends you into the flock at once, and opens the line into an email sign-up", async () => {
  localStorage.clear();
  // Stands in for Buttondown, so the test signs no one up.
  const fetch = vi.fn((..._args: Parameters<typeof window.fetch>) => Promise.resolve(new Response(null)));
  vi.stubGlobal("fetch", fetch);
  const screen = await render(<Home />);
  const canvas = screen.container.querySelector<HTMLCanvasElement>("#sky");
  const youLayer = screen.container.querySelector<HTMLCanvasElement>("#you-layer");
  await expect.poll(() => painted(canvas)).toBeGreaterThan(0);
  expect(painted(youLayer)).toBe(0);

  await screen.getByRole("button", { name: "Join the flock" }).click();
  // "You" is on its way, without waiting for an email.
  await expect.poll(() => painted(youLayer)).toBeGreaterThan(0);
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("You’re in the flock! Enter your email for updates, or skip.");
  const email = screen.getByRole("textbox", { name: "You’re in! Get email updates:" });
  await expect.element(email).toHaveAttribute("type", "email");
  // The sign-up takes the whole line: Read the plan makes way.
  const main = screen.getByRole("main");
  await expect.poll(() => main.getByRole("link", { name: "Read the plan" }).elements()).toHaveLength(0);

  // It takes a real click (the page around it lets clicks through to the flock).
  await email.click();
  await expect.element(email).toHaveFocus();

  // Without an email, the browser asks for one and nothing is sent.
  const send = screen.getByRole("button", { name: "Sign up" });
  await send.click();
  expect(fetch).not.toHaveBeenCalled();

  // The email goes to Buttondown in the background, so the reader stays here.
  await email.fill("test@example.com");
  await send.click();
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("Thanks! Check your inbox to confirm. Now read the plan!");
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe(SIGN_UP_URL);
  expect(init?.method).toBe("POST");
  expect(init?.mode).toBe("no-cors");
  const body = init?.body as FormData;
  expect(body.get("email")).toBe("test@example.com");
  expect(body.get("embed")).toBe("1");
  expect(screen.container.querySelector("form.signup")).toBeNull();

  // Then the whole line points you to the plan, and focus moves on to it.
  const next = main.getByRole("link", { name: "You’re in! Now read the plan!" });
  await expect.element(next).toHaveAttribute("href", "/plan");
  await expect.element(next).toHaveFocus();

  // It stays on the page: reading the plan is up to the reader.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(screen.getByText("The plan page").elements()).toHaveLength(0);
});

test("you can skip the email and go straight to the plan", async () => {
  const fetch = vi.fn(() => Promise.resolve(new Response(null)));
  vi.stubGlobal("fetch", fetch);
  const screen = await render(<Home />);

  await screen.getByRole("button", { name: "Join the flock" }).click();
  await screen.getByRole("button", { name: "Skip" }).click();
  const next = screen.getByRole("main").getByRole("link", { name: "You’re in! Now read the plan!" });
  await expect.element(next).toHaveAttribute("href", "/plan");
  await expect.element(screen.getByRole("status")).toHaveTextContent("You’re in! Now read the plan!");
  expect(screen.getByRole("textbox").elements()).toHaveLength(0);
  expect(fetch).not.toHaveBeenCalled();

  await next.click();
  await expect.element(screen.getByText("The plan page")).toBeInTheDocument();
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

test("if the email can't be sent, the field stays so you can try again", async () => {
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
  const screen = await render(<Home />);

  await screen.getByRole("button", { name: "Join the flock" }).click();
  const email = screen.getByRole("textbox", { name: "You’re in! Get email updates:" });
  await email.fill("test@example.com");
  await screen.getByRole("button", { name: "Sign up" }).click();
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("That didn’t go through. Check your connection and try again.");
  await expect.element(screen.getByText("That didn’t go through. Try again?")).toBeVisible();
  await expect.element(email).toHaveValue("test@example.com");
  await expect.element(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
});
