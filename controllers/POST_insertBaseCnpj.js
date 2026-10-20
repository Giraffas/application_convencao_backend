import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postInsertCnpjBase(req, res) {
  try {
    const direnv = pathAbsolute(".env");
    config({ path: direnv });
    const ambient = process.env.AMBIENT;

    const { cnpj, razao_social, restaurante, uf, cidade, cep } = req.body;

    if (!cnpj) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Não será possivel cadastrar um novo CNPJ sem a informação do CNPJ",
      });
    }
    if (!razao_social) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Não será possivel cadastrar um novo CNPJ sem a informação da Razão Social",
      });
    }
    if (!restaurante) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Não será possivel cadastrar um novo CNPJ sem a informação do nome do Restaurante",
      });
    }
    if (!uf) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Não será possivel cadastrar um novo CNPJ sem a informação do UF",
      });
    }
    if (!cidade) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Não será possivel cadastrar um novo CNPJ sem a informação da cidade",
      });
    }
    if (!cep) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "Não será possivel cadastrar um novo CNPJ sem a informação do cep",
      });
    }

    const client = await supabase();

    const { error } = await client.schema(ambient).from("EV_BASE_CNPJ_ATIVA").insert({
      cnpj: cnpj,
      razao_social: razao_social,
      restaurante: restaurante,
      uf: uf,
      cidade: cidade,
      cep: cep,
    });

    if (error) {
      console.error("Erro ao realizar insert de um cnpj base  ", error);
      return res.status(400).json({});
    }
    return res.status(200).json({
      sucess: true,
      mensagem: "Novo CNPJ cadastrado com sucesso",
    });
  } catch (error) {
    console.error("Erro interno na tentativa de insert de novo CNPJ na base");
    return res.status(500).json({
      erro: true,
      mensagem: "Erro interno na tentativa de insert de novo CNPJ na base",
      msg_error: error,
    });
  }
}
