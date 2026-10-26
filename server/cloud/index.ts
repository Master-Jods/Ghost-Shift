import { createCloudApp } from "./app";
const app = createCloudApp({
  databaseUrl: process.env.DATABASE_URL,
  bootstrapUser: process.env.OPERATOR_USER,
  bootstrapPassword: process.env.OPERATOR_PASSWORD,
  graceMs: Number(process.env.DISCONNECT_GRACE_MS || 10000),
});
await app.service.ready;
const port = await app.listen();
console.log(
  `Among the Shadows PostgreSQL authoritative server listening on port ${port}.`,
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => void app.close().then(() => process.exit(0)));
