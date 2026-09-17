import pathAbsolute from "../functions/pathAbsolute.js";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

export default async function supabase() {
  try {
    const direnv = pathAbsolute(".env");
    config({ path: direnv });
    const supabaseUrl = `${process.env.SUPABASE_URL}`;
    const supabaseKey = `${process.env.SUPABASE_KEY}`;
    const client = await createClient(supabaseUrl, supabaseKey);
    return client;
  } catch (err) {
    console.error("Erro ao se conectar no supabase");
    console.error(err);
  }
}
