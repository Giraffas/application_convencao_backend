import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postAtualizaCnpj(req, res) {
  try {
    const direnv = pathAbsolute(".env");
    config({ path: direnv });
    const ambient = process.env.AMBIENT;

    const { cnpj, razao_social, restaurante } = req.body;

    if (!cnpj) {
      return res.status(400).json({
        erro: true,
        mensagem: "não é possivel concluir a operação sem a informação do CNPJ",
      });
    }
    if (!razao_social) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "não é possivel concluir a operação sem a informação da Razão Social",
      });
    }
    if (!restaurante) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "não é possivel concluir a operação sem a informação do Restaurante",
      });
    }
    const client = await supabase();

    const { data, error } = await client
      .schema(ambient)
      .from("EV_BASE_CNPJ_ATIVA")
      .update({ cnpj: cnpj })
      .eq("cnpj", cnpj)
      .eq("razao_social", razao_social)
      .eq("restaurante", restaurante)
      .select("*");

    if (error) {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao atualizar CNPJ na base",
        msg_erro: error,
      });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({
        erro: true,
        mensagem: "O cnpj nao foi encontrado na base para ser atualizado",
      });
    }
    return res.status(200).json({
      sucess: true,
      mensagem: "CNPJ atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao realizar tentativa de atualizacao na base de CNPJ");
    return res.status(500).json({
        erro: true,
        mensagem: 'Erro interno na tentativa de realizar atualização de CNPJ na base',
        msg_erro: error
    })
  }
}
