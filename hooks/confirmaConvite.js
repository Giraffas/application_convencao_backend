import postConfirmaParcela from "../controllers/POST_confirmaParcela.js";
import postResgataConvite from "../controllers/POST_resgataConvite.js";
import calculaData from "../functions/calculaData.js";
import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import postAlteraCnpj from "../controllers/POST_alteraCnpj.js";
import postInsertEmpresa from "../controllers/POST_InsertEmpresa.js";
export default async function hookConfirmaConvite(req, res) {
  try {
    const {
      nome_evento,
      cpf,
      email_convidado,
      email_anfitriao,
      cnpj,
      razao_social,
      cep,
      endereco,
      complemento,
      bairro,
      cidade,
      uf,
    } = req.body;
    if (!nome_evento) {
      return res.status(500).json({
        erro: true,
        mensagem: "Evento para cadastro nao informado",
      });
    }
    const database = await getDataEvento(nome_evento, res);
    const dataCalculada = calculaData(database.data_evento);
    if (dataCalculada < 30) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "As reservas só podem ser resgatadas com 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com",
      });
    }
    const resgateConvite = await postResgataConvite(
      email_convidado,
      email_anfitriao,
    );

    if (resgateConvite == "status400") {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao gerar resgate do convite",
      });
    }
    if (resgateConvite == "status500") {
      return res.status(500).json({
        erro: true,
        mensagem: "Erro ao gerar resgate do convite",
      });
    }
    const confirmaParcela = await postConfirmaParcela(cpf);
    if (confirmaParcela == "status400") {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao fazer confirmacao da parcela",
      });
    }
    if (confirmaParcela == "status500") {
      return res.status(500).json({
        erro: true,
        mensagem: "Erro ao fazer confirmacao da parcela",
      });
    }
    const alteraCnpj = await postAlteraCnpj(cpf, cnpj);
    if (alteraCnpj == "status400") {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao fazer confirmacao da parcela",
      });
    }
    if (alteraCnpj == "status500") {
      return res.status(500).json({
        erro: true,
        mensagem: "Erro ao fazer confirmacao da parcela",
      });
    }
    const insertEmpresa = await postInsertEmpresa(
      razao_social,
      cnpj,
      cep,
      endereco,
      complemento,
      bairro,
      cidade,
      uf,
      cpf,
    );
    if (insertEmpresa == "status400") {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao fazer confirmacao da parcela",
      });
    }
    if (insertEmpresa == "status500") {
      return res.status(500).json({
        erro: true,
        mensagem: "Erro ao fazer confirmacao da parcela",
      });
    }
    return res.status(200).json({
      sucess: true,
      mensagem: "Convite resgatado com sucesso",
    });
  } catch (error) {
    console.log("Erro na execucao do hook de resgate de convite  ", error);
    return res.status(500).json({
      erro: true,
      mensagem: "Erro na execucao do hook de resgate de convite",
      msg_erro: error,
    });
  }
}
