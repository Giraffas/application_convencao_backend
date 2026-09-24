import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import getConsultaPedido from "../controllers/GET_conferenciaCodigoPedido.js";
import postCadastroEventoAtomico from "../controllers/POST_cadastroEventoAtomico.js";
import calculaData from "../functions/calculaData.js";
import geraCodigoPedido from "../functions/geraCodigoPedido.js";
import { enviarConfirmacaoCadastro } from "../services/emailConfirmacaoCadastro.js";
import { diagnosticarErroEmail } from "../services/email.js";
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

export function criarHookCadastro({
  preparar = prepararCadastro,
  consultarEvento = getDataEvento,
  gerarCodigo = gerarCodigoPedidoDisponivel,
  gravarCadastro = postCadastroEventoAtomico,
  enviarConfirmacao = enviarConfirmacaoCadastro,
} = {}) {
  return async function hookCadastro(req, res) {
    try {
      const cadastro = preparar(req.body);
      const evento = await consultarEvento(cadastro.nome_evento);

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

      const idPedido = await gerarCodigo();
      const resultado = await gravarCadastro({
        ...cadastro,
        id_pedido: idPedido,
      });

      if (resultado === "status500" || resultado === "status400") {
        return res.status(500).json({
          erro: true,
          mensagem: "Não foi possível concluir o cadastro. Nenhum dado foi gravado",
        });
      }

      let emailEnviado = false;
      try {
        await enviarConfirmacao({ cadastro, idPedido, evento });
        emailEnviado = true;
      } catch (error) {
        console.error("Falha ao enviar confirmação do cadastro", {
          id_pedido: idPedido,
          ...diagnosticarErroEmail(error),
        });
      }

      return res.status(200).json({
        sucess: true,
        success: true,
        mensagem: "Cliente cadastrado com sucesso",
        id_pedido: idPedido,
        pedido_origem: cadastro.pedido_origem ?? null,
        email_enviado: emailEnviado,
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
  };
}

export default criarHookCadastro();
