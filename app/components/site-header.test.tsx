import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { SiteHeader } from "./site-header";

test("the nav links to the plan, the contribute page and the about page", async () => {
  const Stub = createRoutesStub([{ path: "/", Component: SiteHeader }]);
  const screen = await render(<Stub initialEntries={["/"]} />);
  const nav = screen.getByRole("navigation", { name: "Primary" });

  // On phones the plan link shows just "Read", but its name stays whole.
  await expect.element(nav.getByRole("link", { name: "Read the Plan" })).toHaveAttribute("href", "/plan");
  await expect.element(nav.getByRole("link", { name: "Contribute" })).toHaveAttribute("href", "/contribute");
  await expect.element(nav.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  expect(nav.getByRole("link").all()).toHaveLength(3);
});
