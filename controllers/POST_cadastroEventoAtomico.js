import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export async function executarCadastroAtomico(client, ambient, payload) {
  return client
    .schema(ambient)
    .rpc("cadastrar_evento", { p_payload: payload });
}

export default async function postCadastroEventoAtomico(payload) {
  try {
    const direnv = pathAbsolute(".env");
    config({ path: direnv });
    const ambient = process.env.AMBIENT;
    const client = await supabase();

    if (!client || !ambient) {
      console.error("Cliente Supabase ou schema não configurado para o cadastro");
      return "status500";
    }

    const { data, error } = await executarCadastroAtomico(client, ambient, payload);

    if (error) {
      console.error("Erro ao executar cadastro atômico", {
        code: error.code,
        message: error.message,
      });
      return "status500";
    }

    return data;
  } catch (error) {
    console.error("Erro interno ao executar cadastro atômico", error);
    return "status500";
  }
}
