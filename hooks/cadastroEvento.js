import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import getConsultaPedido from "../controllers/GET_conferenciaCodigoPedido.js";
import postCadastroEventoAtomico from "../controllers/POST_cadastroEventoAtomico.js";
import calculaData from "../functions/calculaData.js";
import geraCodigoPedido from "../functions/geraCodigoPedido.js";
import {
  ErroValidacaoCadastro,
  prepararCadastro,
} from "../functions/cadastroEvento.js";

async function gerarCodigoPedidoDisponivel() {
  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    const codigoPedido = geraCodigoPedido();
    const disponivel = await getConsultaPedido(codigoPedido);

    if (disponivel === "status400" || disponivel === "status500") {
      throw new Error("Falha ao consultar a disponibilidade do código do pedido");
    }
    if (disponivel === true) return codigoPedido;
  }

  throw new Error("Não foi possível gerar um código de pedido disponível");
}

export default async function hookCadastro(req, res) {
  try {
    const cadastro = prepararCadastro(req.body);
    const evento = await getDataEvento(cadastro.nome_evento);

    if (!evento?.data_evento) {
      return res.status(400).json({
        erro: true,
        mensagem: "Evento não encontrado ou indisponível para cadastro",
      });
    }

    const diasAteEvento = calculaData(evento.data_evento);
    if (typeof diasAteEvento !== "number" || diasAteEvento < 30) {
      return res.status(400).json({
        erro: true,
        mensagem:
          "As reservas devem ser feitas com pelo menos 30 dias de antecedência",
      });
    }

    const idPedido = await gerarCodigoPedidoDisponivel();
    const resultado = await postCadastroEventoAtomico({
      ...cadastro,
      id_pedido: idPedido,
    });

    if (resultado === "status500" || resultado === "status400") {
      return res.status(500).json({
        erro: true,
        mensagem: "Não foi possível concluir o cadastro. Nenhum dado foi gravado",
      });
    }

    return res.status(200).json({
      sucess: true,
      success: true,
      mensagem: "Cliente cadastrado com sucesso",
      id_pedido: idPedido,
      pedido_origem: cadastro.pedido_origem ?? null,
    });
  } catch (error) {
    if (error instanceof ErroValidacaoCadastro) {
      return res.status(400).json({
        erro: true,
        mensagem: error.message,
      });
    }

    console.error("Erro no hook de cadastro", error);
    return res.status(500).json({
      erro: true,
      mensagem: "Erro interno ao processar o cadastro",
    });
  }
}
