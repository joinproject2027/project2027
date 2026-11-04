import type { Route } from "./+types/home";
import { FlockHero } from "~/components/flock-hero";
import { pageMeta } from "~/lib/meta";

export const meta: Route.MetaFunction = () =>
  pageMeta({
    title: "Project 2027",
    description:
      "We spend over $300 billion a year renting government software. Decades of privatization cost us the muscle to build our own. Time to build it back. No more waiting: the rebuild starts now.",
    path: "/",
  });

export default function Home() {
  return <FlockHero />;
}
