import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function getDataEventoRoute(req, res) {
  try {
    const { nome_evento } = req.body;
    const direnv = pathAbsolute(".env");
    config({ path: direnv });
    const ambient = process.env.AMBIENT;

    const client = await supabase();

    const { data, error } = await client
      .schema(ambient)
      .from("EV_DATA_EVENTO")
      .select("data_evento")
      .eq("nome_evento", nome_evento);
    if (error) {
      res.status(401).json({
        error: true,
        mensagem: "Erro ao consultar data do evento",
        msg_erro: error,
      });
    }
    if (!data || data.length == 0) {
        res.status(400).json({
            erro: true,
            mensagem: 'Evento nao encontrado na base'
        })
    }
    res.status(200).json({
      sucess: true,
      mensagem: 'Consulta realizada com sucesso',
      data: data
    })
  } catch (error) {
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao consultar data do evento pela rota",
      msg_erro: error,
    });
  }
}
