import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import postInsertEmpresa from "../controllers/POST_InsertEmpresa.js";
import postInsertClientes from "../controllers/POST_insertClientes.js";
import postInsertConvites from "../controllers/POST_insertConvites.js";
import postInsertCrianca from "../controllers/POST_insertCrianca.js";
import postInsertPedidos from "../controllers/POST_insertPedidos.js";
import postInsertParcelas from "../controllers/POST_insertParcelas.js";
import getConsultaPedido from "../controllers/GET_conferenciaCodigoPedido.js";
import calculaData from "../functions/calculaData.js";
import geraCodigoPedido from '../functions/geraCodigoPedido.js'

function normalizaBooleano(valor) {
  if (valor === true || valor === "true") return true;
  if (valor === false || valor === "false") return false;
  return null;
}

export default async function hookCadastro(req, res) {
  try {
    const {
      nome_evento,
      clientes = [],
      criancas = [],
      cnpj,
      razao_social,
      cep,
      endereco,
      complemento,
      bairro,
      cidade,
      uf,
      enviou_convite,
      nome_convidado,
      cpf_convidado,
      cnpj_convidado,
      email_convidado,
      pedido_origem,
      transfer = [],
      tipo_quarto,
      divisao_pagamento,
      quantidade_parcelas,
      valor_total,
    } = req.body;

    const enviouConvite = normalizaBooleano(enviou_convite);
    const divisaoPagamento = normalizaBooleano(divisao_pagamento);
    //validacao global de data
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
          "As reservas nao podem ser feitas 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com",
      });
    }
    let codigoTrue = false

    while(codigoTrue == false) {
        const codigo_pedido = geraCodigoPedido()
        const pedido_banco = await getConsultaPedido(codigo_pedido)
        
        if(pedido_banco == 'status400') {
          return res.status(400).json({
            erro: true,
            mensagem: 'Erro ao gerar codigo de pedido '
          })
        }
        if(pedido_banco == 'status500') {
          return res.status(500).json({
            erro: true,
            mensagem: 'Erro ao gerar codigo de pedido '
          })
        }
        console.log('pedido banco:  ', pedido_banco)
        if(pedido_banco){
          codigoTrue = codigo_pedido
        }
    }



    if (!razao_social) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao razao social vazia, por gentileza, preencher",
      });
    }
    if (!cnpj) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao cnpj vazia, por gentileza, preencher",
      });
    }
    if (!cep) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao cep vazia, por gentileza, preencher",
      });
    }
    if (!endereco) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao endereco vazia, por gentileza, preencher",
      });
    }
    if (!complemento) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao complemento vazia, por gentileza, preencher",
      });
    }
    if (!bairro) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao bairro vazia, por gentileza, preencher",
      });
    }
    if (!cidade) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao cidade vazia, por gentileza, preencher",
      });
    }
    if (!uf) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informacao uf vazia, por gentileza, preencher",
      });
    }
    if (!Array.isArray(clientes) || clientes.length === 0) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe pelo menos um cliente",
      });
    }

    if (!Array.isArray(criancas)) {
      return res.status(400).json({
        erro: true,
        mensagem: "O campo criancas deve ser uma lista",
      });
    }

    if (clientes.some((cliente) => !cliente.cpf)) {
      return res.status(400).json({
        erro: true,
        mensagem: "Todos os clientes devem possuir CPF",
      });
    }

    if (criancas.some((crianca) => !crianca.cpf_crianca)) {
      return res.status(400).json({
        erro: true,
        mensagem: "Todas as criancas devem possuir CPF",
      });
    }

    const cpfsClientes = clientes.map((cliente) => String(cliente.cpf));
    if (new Set(cpfsClientes).size !== cpfsClientes.length) {
      return res.status(400).json({
        erro: true,
        mensagem: "Existem clientes duplicados no payload",
      });
    }

    const cpfsCriancas = criancas.map((crianca) =>
      String(crianca.cpf_crianca),
    );
    if (new Set(cpfsCriancas).size !== cpfsCriancas.length) {
      return res.status(400).json({
        erro: true,
        mensagem: "Existem criancas duplicadas no payload",
      });
    }

    if (!Array.isArray(transfer) || transfer.length !== 1) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe exatamente um registro de transfer",
      });
    }

    const viagem = transfer[0];
    if (!viagem.regiao_embarque) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe a regiao de embarque",
      });
    }

    if (enviouConvite === null) {
      return res.status(400).json({
        erro: true,
        mensagem: "O campo enviou_convite deve ser true ou false",
      });
    }

    if (divisaoPagamento === null) {
      return res.status(400).json({
        erro: true,
        mensagem: "O campo divisao_pagamento deve ser true ou false",
      });
    }

    if (
      !Number.isInteger(Number(quantidade_parcelas)) ||
      Number(quantidade_parcelas) <= 0
    ) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe uma quantidade de parcelas valida",
      });
    }

    if (!Number.isFinite(Number(valor_total)) || Number(valor_total) <= 0) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe um valor total valido",
      });
    }

    const cliente_responsavel = clientes[0];
    const responsavel = cliente_responsavel;

    if (
      enviouConvite === true &&
      (!nome_convidado || !cpf_convidado || !email_convidado)
    ) {
      return res.status(400).json({
        erro: true,
        mensagem: "Informe nome, CPF e e-mail do convidado",
      });
    }

    const {
      nome,
      nome_cracha,
      cpf,
      email,
      data_nascimento,
      telefone,
      tm_camiseta,
      tm_chinelo,
      tipo_cliente,
    } = cliente_responsavel;
    const cadastroLojas = await postInsertEmpresa(
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

    if (cadastroLojas == "status400") {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao inserir empresa",
      });
    }

    if (cadastroLojas == "status500") {
      return res.status(500).json({
        erro: true,
        mensagem: "Erro interno no servido ao cadastrar empresa",
      });
    }
    //Insert clientes
    for (const cliente of clientes) {
      const {
        nome,
        nome_cracha,
        cpf,
        email,
        data_nascimento,
        telefone,
        tm_camiseta,
        tm_chinelo,
        tipo_cliente,
      } = cliente;

     
      if (cliente_responsavel.cpf === cpf) {
        const cadastroClientes = await postInsertClientes(
          nome,
          nome_cracha,
          cpf,
          email,
          data_nascimento,
          tm_camiseta,
          tm_chinelo,
          enviouConvite,
          cnpj,
          telefone,
          "ANFITRIAO",
        );

        if (cadastroClientes === "status400") {
          return res.status(400).json({
            erro: true,
            mensagem: "Erro ao cadastrar cliente",
          });
        }

        if (cadastroClientes === "status500") {
          return res.status(500).json({
            erro: true,
            mensagem: "Erro interno no servidor ao cadastrar cliente",
          });
        }
      } else {
        const cadastroClientes = await postInsertClientes(
          nome,
          nome_cracha,
          cpf,
          email,
          data_nascimento,
          tm_camiseta,
          tm_chinelo,
          false,
          cnpj,
          telefone,
          "CONVIDADO",
        );

        if (cadastroClientes === "status400") {
          return res.status(400).json({
            erro: true,
            mensagem: "Erro ao cadastrar cliente",
          });
        }

        if (cadastroClientes === "status500") {
          return res.status(500).json({
            erro: true,
            mensagem: "Erro interno no servidor ao cadastrar cliente",
          });
        }
      }
    }

    // INSERT DE CONVITE: no maximo um registro por requisicao.
    if (enviouConvite === true) {
      const convite = await postInsertConvites(
        responsavel.nome,
        responsavel.cpf,
        cnpj,
        responsavel.email,
        nome_convidado,
        cpf_convidado,
        email_convidado,
      );

      if (convite === "status400") {
        return res.status(400).json({
          erro: true,
          mensagem: "Erro ao registrar convite",
        });
      }

      if (convite === "status500") {
        return res.status(500).json({
          erro: true,
          mensagem: "Erro interno no servidor ao gerar convite",
        });
      }
    }

    //INSERT CRIANCAS
    if (Array.isArray(criancas) && criancas.length > 0) {
      for (const crianca of criancas) {
        const { nome_crianca, cpf_crianca, data_nascimento } = crianca;

        const cadastraCrianca = await postInsertCrianca(
          nome,
          cpf,
          email,
          telefone,
          cpf_crianca,
          nome_crianca,
          data_nascimento,
        );

        if (cadastraCrianca === "status400") {
          return res.status(400).json({
            erro: true,
            mensagem: "Erro ao inserir cadastro da criança",
          });
        }

        if (cadastraCrianca === "status500") {
          return res.status(500).json({
            erro: true,
            mensagem: "Erro interno ao inserir cadastro da criança",
          });
        }
      }
    }
    // GERACAO DE PEDIDO: um registro por requisicao, vinculado ao responsavel.
    const {
      data_embarque,
      regiao_embarque,
      horario_embarque,
    } = viagem;

    const inserePedido = await postInsertPedidos(
      responsavel.nome,
      responsavel.email,
      responsavel.cpf,
      cnpj,
      tipo_quarto ?? null,
      divisaoPagamento,
      quantidade_parcelas,
      data_embarque ?? null,
      regiao_embarque,
      horario_embarque ?? null,
      codigoTrue,
    );

    if (inserePedido === "status400") {
      return res.status(400).json({
        erro: true,
        mensagem: "Erro ao inserir pedido",
      });
    }

    if (inserePedido === "status500") {
      return res.status(500).json({
        erro: true,
        mensagem: "Erro interno no servidor ao registrar pedido",
      });
    }

    //GERACAO DE INFORMACAO DE PGTO
    if (enviouConvite === true) {
      const parcela_valor = parseFloat(valor_total) / 2;

      for (const cliente of clientes) {
        const { cpf } = cliente;

        if (cliente_responsavel.cpf == cpf) {
          for (
            let numero_parcela = 1;
            numero_parcela <= quantidade_parcelas;
            numero_parcela++
          ) {
            const insereParcela = await postInsertParcelas(
              cpf,
              numero_parcela,
              parseFloat(parcela_valor) / parseFloat(quantidade_parcelas),
              true,
              codigoTrue
            );
            if (insereParcela == "status400") {
              return res.status(400).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
            if (insereParcela == "status500") {
              return res.status(500).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
          }
        } else {
          for (
            let numero_parcela = 1;
            numero_parcela <= quantidade_parcelas;
            numero_parcela++
          ) {
            const insereParcela = await postInsertParcelas(
              cpf,
              numero_parcela,
              parseFloat(parcela_valor) / parseFloat(quantidade_parcelas),
              false,
              codigoTrue
            );
            if (insereParcela == "status400") {
              return res.status(400).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
            if (insereParcela == "status500") {
              return res.status(500).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
          }
        }
      }
    } else {
      for (const cliente of clientes) {
        const { cpf } = cliente;

        if (cliente_responsavel.cpf == cpf) {
          for (
            let numero_parcela = 1;
            numero_parcela <= quantidade_parcelas;
            numero_parcela++
          ) {
            const insereParcela = await postInsertParcelas(
              cpf,
              numero_parcela,
              parseFloat(valor_total) / parseFloat(quantidade_parcelas),
              true,
              codigoTrue
            );
            if (insereParcela == "status400") {
              return res.status(400).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
            if (insereParcela == "status500") {
              return res.status(500).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
          }
        } else {
          for (
            let numero_parcela = 1;
            numero_parcela <= quantidade_parcelas;
            numero_parcela++
          ) {
            const insereParcela = await postInsertParcelas(
              cpf,
              numero_parcela,
              parseFloat(valor_total) / parseFloat(quantidade_parcelas),
              false,
              codigoTrue
            );
            if (insereParcela == "status400") {
              return res.status(400).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
            if (insereParcela == "status500") {
              return res.status(500).json({
                erro: true,
                mensagem: "Erro ao inserir parcela",
              });
            }
          }
        }
      }
    }
    return res.status(200).json({
      sucess: true,
      mensagem: "Cliente cadastrado com sucesso",
      id_pedido: codigoTrue,
      pedido_origem: pedido_origem ?? null,
    });
  } catch (error) {
    console.error("Erro no hook de cadastro:  ", error);
    res.status(500).json({
      erro: true,
      mensagem: "Erro no hook de cadastro",
      msg_erro: error,
    });
  }
}
