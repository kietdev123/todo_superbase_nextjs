import packageJson from "../../package.json";

export const appConfig = {
  name: "Todo Admin",
  description: "Supabase administration dashboard",
  version: packageJson.version,
} as const;
