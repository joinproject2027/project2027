import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { SIGN_UP_URL, SignUpForm } from "./sign-up";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("signing up sends your email to Buttondown in the background, then thanks you", async () => {
  // Stands in for Buttondown, so the test signs no one up.
  const fetch = vi.fn((..._args: Parameters<typeof window.fetch>) => Promise.resolve(new Response(null)));
  vi.stubGlobal("fetch", fetch);
  const screen = await render(<SignUpForm />);

  const email = screen.getByRole("textbox", { name: "Your email" });
  const send = screen.getByRole("button", { name: "Sign up" });
  await email.click();
  await expect.element(email).toHaveFocus();

  // Without an email, the browser asks for one and nothing is sent.
  await send.click();
  expect(fetch).not.toHaveBeenCalled();

  await email.fill("test@example.com");
  await send.click();
  await expect.element(screen.getByRole("status")).toHaveTextContent("Thanks! Check your inbox to confirm.");
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe(SIGN_UP_URL);
  expect(init?.method).toBe("POST");
  expect(init?.mode).toBe("no-cors");
  const body = init?.body as FormData;
  expect(body.get("email")).toBe("test@example.com");
  expect(body.get("embed")).toBe("1");

  // The thank-you takes the form's place, and focus with it.
  expect(screen.container.querySelector("form")).toBeNull();
  const thanks = screen.getByText(/Thanks! Check your inbox to confirm\./, { exact: false }).first();
  await expect.element(thanks).toHaveFocus();
});

test("if the email can't be sent, the form stays so you can try again", async () => {
  vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
  const screen = await render(<SignUpForm />);

  const email = screen.getByRole("textbox", { name: "Your email" });
  await email.fill("test@example.com");
  await screen.getByRole("button", { name: "Sign up" }).click();
  await expect
    .element(screen.getByRole("status"))
    .toHaveTextContent("That didn’t go through. Check your connection and try again.");
  await expect.element(email).toHaveValue("test@example.com");
  await expect.element(email).toHaveAccessibleDescription("That didn’t go through. Check your connection and try again.");
  await expect.element(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
});
