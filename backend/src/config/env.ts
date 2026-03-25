import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

const envPathFromCwd = path.resolve(process.cwd(), ".env");
const envPathFromWorkspaceRoot = path.resolve(process.cwd(), "backend/.env");
const envPath = fs.existsSync(envPathFromCwd) ? envPathFromCwd : envPathFromWorkspaceRoot;

dotenv.config({ path: envPath });

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET ?? "change_me_please",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
};

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  console.warn("Missing Supabase environment variables. Backend queries will fail until configured.");
}
