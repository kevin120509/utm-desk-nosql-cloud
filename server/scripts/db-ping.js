// Comprueba la conexión a Atlas y al bucket de Supabase. No imprime secretos.
// Uso: npm run db:ping
import "dotenv/config";
import { MongoClient } from "mongodb";
import { createClient } from "@supabase/supabase-js";

let fallos = 0;
const ok = (txt) => console.log(`OK    ${txt}`);
const mal = (txt) => {
  console.log(`FALLA ${txt}`);
  fallos++;
};

async function pingMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<") || uri.startsWith("PEGA")) {
    return mal("MongoDB Atlas: MONGODB_URI sin completar en server/.env");
  }
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await cliente.connect();
    const db = cliente.db(process.env.MONGODB_DB || "utmdesk");
    await db.command({ ping: 1 });
    ok(`MongoDB Atlas: ping a la base "${db.databaseName}"`);
  } catch (e) {
    mal(`MongoDB Atlas: ${e.codeName || e.name}`);
  } finally {
    await cliente.close();
  }
}

async function pingSupabase() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET = "evidencias" } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return mal("Supabase: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en server/.env");
  }
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.storage.getBucket(SUPABASE_BUCKET);
    if (error) throw error;
    ok(`Supabase Storage: bucket "${data.name}" (${data.public ? "PÚBLICO, revisar" : "privado"})`);
  } catch (e) {
    mal(`Supabase Storage: ${e.message || e.name}`);
  }
}

await pingMongo();
await pingSupabase();
process.exit(fallos ? 1 : 0);
