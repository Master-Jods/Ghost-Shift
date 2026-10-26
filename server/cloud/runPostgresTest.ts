import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  ["--import", "tsx", "--test", "server/cloud-postgres.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, CLOUD_EMBEDDED_POSTGRES: "1" },
    windowsHide: true,
  },
);
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
