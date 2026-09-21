import postAtivaInscricao from "../controllers/POST_ativaInscricao.js";
import postAtivaReserva from "../controllers/POST_ativaReserva.js";
import calculaData from "../functions/calculaData.js";
import getDataEvento from "../controllers/GET_consultaDataEvento.js";

export default async function hookReativaPedido(req, res) {
  try {
    const { nome_evento, cpf, email } = req.body;
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
          "As reservas só podem ser resgatadas ou canceladas com 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com",
      });
    }
    const ativaReserva = await postAtivaReserva(
        cpf,
        email 
    )
    if(ativaReserva == 'status400') {
        res.status(400).json({
            erro: true,
            mensagem: 'Erro ao ativar reserva do cliente'
        })
    }
    if(ativaReserva == 'status500') {
    res.status(500).json({
        erro: true,
        mensagem: 'Erro  interno no servidor ao ativar reserva do cliente'
    })
    }
    const ativaInscricao = await postAtivaInscricao (
        cpf,
        email
    )
    if(ativaInscricao == 'status400') {
        res.status(400).json({
            erro: true,
            mensagem: 'Erro ao ativar inscricao do cliente'
        })
    }

    if(ativaInscricao == 'status500') {
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno ao ativar inscricao do cliente'
        })
    }
    res.status(200).json({
        sucess: true,
        mensagem: 'Inscricao reativa com sucesso'
    })
  } catch (error) {
    console.error("Erro ao reativar inscricao  ", error);
    res.status(500).json({
      error: true,
      mensagem: "Erro ao reativar cliente",
      msg_erro: error,
    });
  }
}
