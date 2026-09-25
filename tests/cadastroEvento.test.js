import test from "node:test";
import assert from "node:assert/strict";
import {
  ErroValidacaoCadastro,
  NOME_EVENTO_ATIVO,
  calcularIdadeNaData,
  dividirEmParcelas,
  prepararCadastro,
} from "../functions/cadastroEvento.js";
import { executarCadastroAtomico } from "../controllers/POST_cadastroEventoAtomico.js";

const cpfsValidos = [
  "52998224725",
  "11144477735",
  "93541134780",
  "12345678909",
  "16899535009",
];

function cliente(indice) {
  return {
    nome: `Cliente ${indice + 1}`,
    nome_cracha: `Cliente ${indice + 1}`,
    cpf: cpfsValidos[indice],
    email: `cliente${indice + 1}@email.com`,
    data_nascimento: "1995-05-20",
    telefone: `6199999999${indice}`,
    tm_camiseta: "M",
    tm_chinelo: "39/40",
    participa_auditorio: true,
    idade_evento: 1,
    categoria: "valor não confiável",
    valor_individual: 1,
  };
}

function acompanhante(indice) {
  return {
    ...cliente(indice + 1),
    cpf_anfitriao: cpfsValidos[0],
  };
}

function payloadBase(tipoQuarto = "SINGLE") {
  const ocupacao = { SINGLE: 1, DUPLO: 2, TRIPLO: 3 }[tipoQuarto];
  const valorTotal = tipoQuarto === "SINGLE" ? 5680 : 3848 * ocupacao;

  return {
    nome_evento: "Convencao Giraffas 2027",
    clientes: [cliente(0)],
    acompanhantes: Array.from(
      { length: ocupacao - 1 },
      (_, indice) => acompanhante(indice),
    ),
    criancas: [],
    cnpj: "11222333000181",
    razao_social: "Empresa Teste LTDA",
    cep: "70000000",
    endereco: "Rua das Flores, 100",
    complemento: "Não informado",
    bairro: "Centro",
    cidade: "Brasília",
    uf: "DF",
    enviou_convite: false,
    transfer: [
      {
        data_embarque: null,
        regiao_embarque: "Santos Dumont - SDU",
        horario_embarque: "14h30",
        data_desembarque: null,
        regiao_desembarque: "Galeão - GIG",
        horario_desembarque: "9h30",
      },
    ],
    tipo_quarto: tipoQuarto,
    preferencia_cama: "CASAL",
    divisao_pagamento: false,
    quantidade_parcelas: 4,
    valor_total: valorTotal,
  };
}

function crianca(indice, dataNascimento = "2018-03-10") {
  return {
    nome_crianca: `Criança ${indice + 1}`,
    cpf_crianca: cpfsValidos[3 + indice],
    data_nascimento: dataNascimento,
    email: `responsavel${indice + 1}@email.com`,
    tm_camiseta: "P",
    tm_chinelo: "35/36",
    idade_evento: 99,
    categoria: "valor não confiável",
    valor_individual: 1,
  };
}

test("preserva data_inscricao recebida na raiz do payload", () => {
  const cadastro = prepararCadastro({ ...payloadBase(), data_inscricao: "2026-09-24" });
  assert.equal(cadastro.data_inscricao, "2026-09-24");
});

test("gera data_inscricao atual em São Paulo quando não informada", () => {
  const atual = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const antes = atual();
  const cadastro = prepararCadastro(payloadBase());
  assert.ok([antes, atual()].includes(cadastro.data_inscricao));
  assert.match(cadastro.data_inscricao, /^\d{4}-\d{2}-\d{2}$/);
});

test("rejeita data_inscricao inválida antes de gravar o cadastro", () => {
  for (const data_inscricao of ["2026-02-30", "24/09/2026", "2026-00-24", 123]) {
    assert.throws(() => prepararCadastro({ ...payloadBase(), data_inscricao }), ErroValidacaoCadastro);
  }
});

test("aceita SINGLE com um participante", () => {
  const cadastro = prepararCadastro(payloadBase("SINGLE"));
  assert.equal(cadastro.clientes.length, 1);
  assert.equal(cadastro.clientes[0].valor_individual, 5680);
  assert.equal(NOME_EVENTO_ATIVO, "encontro_franqueados_2027");
  assert.equal(cadastro.nome_evento, NOME_EVENTO_ATIVO);
});

test("aceita DUPLO com dois participantes", () => {
  const cadastro = prepararCadastro(payloadBase("DUPLO"));
  assert.equal(cadastro.clientes.length, 1);
  assert.equal(cadastro.acompanhantes.length, 1);
  assert.equal(cadastro.acompanhantes[0].cpf_anfitriao, cadastro.clientes[0].cpf);
  assert.equal(cadastro.valor_total, 7696);
  assert.equal(cadastro.tipo_cama, "CASAL");
  assert.equal(cadastro.preferencia_cama, "CASAL");
});

test("ignora valor_total recebido e mantém o cálculo fixo do backend", () => {
  const valorIncorreto = payloadBase("DUPLO");
  valorIncorreto.valor_total = 1;
  assert.equal(prepararCadastro(valorIncorreto).valor_total, 7696);

  const semValor = payloadBase("DUPLO");
  delete semValor.valor_total;
  assert.equal(prepararCadastro(semValor).valor_total, 7696);
});

test("normaliza preferencia_cama e rejeita valor vazio", () => {
  const payload = payloadBase("SINGLE");
  payload.preferencia_cama = "  solteiro  ";
  assert.equal(prepararCadastro(payload).preferencia_cama, "SOLTEIRO");

  payload.preferencia_cama = "";
  assert.throws(() => prepararCadastro(payload), /preferencia_cama/);
});

test("aceita TRIPLO com três participantes", () => {
  const cadastro = prepararCadastro(payloadBase("TRIPLO"));
  assert.equal(cadastro.clientes.length, 1);
  assert.equal(cadastro.acompanhantes.length, 2);
  assert.equal(cadastro.valor_total, 11544);
});

test("aceita até duas crianças e recalcula os valores", () => {
  const payload = payloadBase("SINGLE");
  payload.criancas = [crianca(0), crianca(1, "2025-05-01")];
  payload.valor_total = 7744;
  const cadastro = prepararCadastro(payload);

  assert.equal(cadastro.criancas.length, 2);
  assert.deepEqual(
    cadastro.criancas.map((item) => item.valor_individual),
    [2064, 0],
  );
});

test("rejeita quarto com quantidade incorreta de adultos", () => {
  const payload = payloadBase("DUPLO");
  payload.acompanhantes.pop();
  assert.throws(() => prepararCadastro(payload), ErroValidacaoCadastro);
});

test("rejeita CPF repetido entre cliente e criança", () => {
  const payload = payloadBase("SINGLE");
  payload.criancas = [
    { ...crianca(0), cpf_crianca: payload.clientes[0].cpf },
  ];
  payload.valor_total = 7744;
  assert.throws(
    () => prepararCadastro(payload),
    /CPFs duplicados entre clientes, acompanhantes e crianças/,
  );
});

test("calcula corretamente os limites das faixas etárias", () => {
  assert.equal(calcularIdadeNaData("2023-04-28"), 3);
  assert.equal(calcularIdadeNaData("2023-04-27"), 4);
  assert.equal(calcularIdadeNaData("2015-04-28"), 11);
  assert.equal(calcularIdadeNaData("2015-04-27"), 12);
});

test("cobrança integral gera parcelas somente para o responsável", () => {
  const payload = payloadBase("DUPLO");
  payload.quantidade_parcelas = 4;
  const cadastro = prepararCadastro(payload);

  assert.equal(cadastro.parcelas.length, 4);
  assert.ok(cadastro.parcelas.every((item) => item.cpf === payload.clientes[0].cpf));
  assert.equal(
    cadastro.parcelas.reduce((total, item) => total + item.valor_parcela, 0),
    7696,
  );
});

test("cobrança dividida atribui o valor das crianças ao responsável", () => {
  const payload = payloadBase("DUPLO");
  payload.divisao_pagamento = true;
  payload.quantidade_parcelas = 2;
  payload.criancas = [crianca(0)];
  payload.valor_total = 9760;
  const cadastro = prepararCadastro(payload);
  const totalResponsavel = cadastro.parcelas
    .filter((item) => item.cpf === payload.clientes[0].cpf)
    .reduce((total, item) => total + item.valor_parcela, 0);
  const totalAcompanhante = cadastro.parcelas
    .filter((item) => item.cpf === payload.acompanhantes[0].cpf)
    .reduce((total, item) => total + item.valor_parcela, 0);

  assert.equal(totalResponsavel, 5912);
  assert.equal(totalAcompanhante, 3848);
  assert.equal(cadastro.parcelas.length, 4);
});

test("divisão de pagamento exige somente nome e telefone do acompanhante", () => {
  const payload = payloadBase("DUPLO");
  payload.divisao_pagamento = true;
  payload.acompanhantes[0] = {
    nome: "Cliente da divisão",
    telefone: "61988888888",
  };

  const cadastro = prepararCadastro(payload);
  const segundoCliente = cadastro.acompanhantes[0];

  assert.equal(segundoCliente.nome, "Cliente da divisão");
  assert.equal(segundoCliente.telefone, "61988888888");
  assert.equal(segundoCliente.cpf, null);
  assert.equal(segundoCliente.email, null);
  assert.equal(segundoCliente.data_nascimento, null);
  assert.equal(segundoCliente.valor_individual, 3848);
  assert.equal(
    cadastro.parcelas.filter((parcela) => parcela.cpf === null).length,
    payload.quantidade_parcelas,
  );
});

test("divisão de pagamento mantém nome e telefone obrigatórios no acompanhante", () => {
  const semNome = payloadBase("DUPLO");
  semNome.divisao_pagamento = true;
  semNome.acompanhantes[0] = { telefone: "61988888888" };
  assert.throws(() => prepararCadastro(semNome), /acompanhantes\[0\]\.nome/);

  const semTelefone = payloadBase("DUPLO");
  semTelefone.divisao_pagamento = true;
  semTelefone.acompanhantes[0] = { nome: "Cliente da divisão" };
  assert.throws(() => prepararCadastro(semTelefone), /telefone.*acompanhantes\[0\]/);
});

test("rejeita CPF repetido entre cliente e acompanhante", () => {
  const payload = payloadBase("DUPLO");
  payload.acompanhantes[0].cpf = payload.clientes[0].cpf;
  assert.throws(
    () => prepararCadastro(payload),
    /CPFs duplicados entre clientes, acompanhantes e crianças/,
  );
});

test("ajusta a diferença de arredondamento na última parcela", () => {
  assert.deepEqual(dividirEmParcelas(568000, 3), [189333, 189333, 189334]);
});

test("cadastro usa uma única RPC e propaga falha sem executar inserts isolados", async () => {
  const chamadas = [];
  const client = {
    schema(schema) {
      chamadas.push(["schema", schema]);
      return {
        async rpc(nome, parametros) {
          chamadas.push(["rpc", nome, parametros]);
          return { data: null, error: { code: "P0001" } };
        },
      };
    },
  };

  const resultado = await executarCadastroAtomico(client, "GIRAFFAS_PROD", {
    id_pedido: "1234567890",
  });

  assert.equal(resultado.error.code, "P0001");
  assert.equal(chamadas.filter(([tipo]) => tipo === "rpc").length, 1);
  assert.equal(chamadas[1][1], "cadastrar_evento");
});
