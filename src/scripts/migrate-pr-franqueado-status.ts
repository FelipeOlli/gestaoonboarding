import { createClient } from "@libsql/client";
import path from "node:path";

async function main() {
  const url = `file:${path.resolve(process.cwd(), "data/local.db")}`;
  const client = createClient({ url });

  await client.execute(
    "UPDATE companies SET pr_franqueado_status = 'em_andamento' WHERE pr_franqueado_status = 'enviado'",
  );
  await client.execute(
    "UPDATE companies SET pr_franqueado_status = 'concluido' WHERE pr_franqueado_status = 'assinado'",
  );

  console.log("Migrated pr_franqueado_status values to em_andamento/concluido");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
