import { postgres, migrate } from "./store";
import { CloudService } from "./service";
const db = postgres(process.env.DATABASE_URL || "");
try {
  const mode = process.argv[2];
  if (mode === "migrate") {
    await migrate(db);
    console.log("PostgreSQL schema ready.");
  } else if (mode === "operator") {
    const service = new CloudService(db);
    await service.ready;
    if (!process.env.OPERATOR_PASSWORD)
      throw Error("Set OPERATOR_PASSWORD before creating the account.");
    await service.createOperator(
      process.env.OPERATOR_USER || "operator",
      process.env.OPERATOR_PASSWORD,
    );
    console.log(
      "Operator account ready; an existing password was not overwritten.",
    );
  } else if (mode === "import") {
    const path = process.argv[3];
    if (!path)
      throw Error(
        "Pass the path to a stopped/backed-up SQLite database: npm run cloud:import -- data/jigsaw.sqlite",
      );
    const { importSqlite } = await import("./importSqlite");
    console.log(JSON.stringify(await importSqlite(db, path)));
  } else throw Error("Use migrate, operator or import.");
} catch (error) {
  console.error(
    error instanceof Error && !/postgres(?:ql)?:\/\//.test(error.message)
      ? error.message
      : "Database operation failed. Check the private connection configuration.",
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
