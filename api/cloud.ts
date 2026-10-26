import { createCloudApp } from "../server/cloud/app";
const app = createCloudApp({
  databaseUrl: process.env.DATABASE_URL,
  bootstrapUser: process.env.OPERATOR_USER,
  bootstrapPassword: process.env.OPERATOR_PASSWORD,
  graceMs: Number(process.env.DISCONNECT_GRACE_MS || 10000),
});
// Export the Node HTTP server so Vercel can deliver upgrade requests to ws.
export default app.server;
