import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("plan", "routes/plan.tsx"),
  route("plan/linux-licensing", "routes/linux-licensing.tsx"),
  route("contribute", "routes/contribute.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;
