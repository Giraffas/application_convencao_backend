import postAlteracaoChecking from "../controllers/POST_alteracaoChecking.js";
import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import calculaData from "../functions/calculaData.js";

export default async function hookAlteraChecking(req, res) {
  const {
    cpf,
    email,
    nome_evento,
    nova_data,
    nova_hora_embarque,
    nova_data_desembarque,
    nova_hora_desembarque,
  } = req.body;

  if (!cpf) {
    return res.status(400).json({
      erro: true,
      mensagem: "Preencha o CPF para alteracao da data de checking",
    });
  }

  if (!email) {
    return res.status(400).json({
      erro: true,
      mensagem: "Preencha o campo email, para alteracao da data de checking",
    });
  }
  if (!nome_evento) {
    return res.status(400).json({
      erro: true,
      mensagem:
        "Preencha o nome do evento , para alteracao da data de checking",
    });
  }

  const dataEvento = await getDataEvento(nome_evento, res);
  const dataCalculada = calculaData(dataEvento.data_evento);
  if (dataCalculada < 30) {
    return res.status(400).json({
      erro: true,
      mensagem:
        "As reservas nao podem ser canceladas ou alteradas com menos de 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com",
    });
  }

  const alteracao = await postAlteracaoChecking(
    cpf,
    email,
    nova_data,
    nova_hora_embarque,
    nova_data_desembarque,
    nova_hora_desembarque
  );
  if (alteracao === false) {
    return res.status(500).json({
      erro: true,
      mensagem: "Erro interno ao executar alteracao de cheking",
    });
  }

  if (alteracao === "status400") {
    return res.status(400).json({
      erro: true,
      mensagem: "Pedido nao encontrado para o CPF e email informados",
    });
  }

  return res.status(200).json({
    sucess: true,
    mensagem: "Alteracao da data de embarque realizada com sucesso",
  });
}
