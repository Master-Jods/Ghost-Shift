import { postgres, migrate } from "./store.js";
import { CloudService } from "./service.js";
const db = postgres(process.env.DATABASE_URL || "", {connectionTimeoutMs:30000});
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
  } else if (mode === "operator-check" || mode === "operator-reset") {
    const service=new CloudService(db);await service.ready;
    const username=process.env.OPERATOR_USER||'operator',password=process.env.OPERATOR_PASSWORD;
    if(!password)throw Error('OPERATOR_PASSWORD is missing from this environment.');
    if(mode==='operator-check')console.log(JSON.stringify(await service.checkOperatorEnvironment(username,password)));
    else{await service.resetOperatorPassword(username,password);console.log('Cloud operator password now matches this environment. Previous operator logins were revoked; gameplay records were preserved.');}
  } else if (mode === "import") {
    const path = process.argv[3];
    if (!path)
      throw Error(
        "Pass the path to a stopped/backed-up SQLite database: npm run cloud:import -- data/jigsaw.sqlite",
      );
    const { importSqlite } = await import("./importSqlite");
    console.log(JSON.stringify(await importSqlite(db, path)));
  } else throw Error("Use migrate, operator, operator-check, operator-reset or import.");
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
