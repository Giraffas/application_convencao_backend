import test from "node:test";
import assert from "node:assert/strict";
import { montarEmailConfirmacaoCadastro } from "../services/emailConfirmacaoCadastro.js";
import { criarHookCadastro } from "../hooks/cadastroEvento.js";
import { diagnosticarErroEmail } from "../services/email.js";

test("diagnóstico SMTP informa código sem expor credenciais ou resposta bruta", () => {
  const diagnostico = diagnosticarErroEmail({
    code: "EAUTH", responseCode: 535,
    message: "senha-secreta", response: "senha-secreta", command: "AUTH senha-secreta",
  });
  assert.equal(diagnostico.codigo, "EAUTH");
  assert.equal(diagnostico.smtp_status, 535);
  assert.doesNotMatch(JSON.stringify(diagnostico), /senha-secreta/);
});

const cadastro = {
  nome_evento: "encontro_franqueados_2027",
  razao_social: "Empresa & Filhos",
  tipo_quarto: "DUPLO",
  preferencia_cama: "SOLTEIRO",
  valor_total: 7696,
  quantidade_parcelas: 3,
  divisao_pagamento: true,
  clientes: [{ nome: '<img src=x onerror="alert(1)">', email: "responsavel@example.com", cpf: "cpf1", categoria: "Adulto", valor_individual: 3848 }],
  acompanhantes: [{ nome: "Acompanhante", cpf: "cpf2", categoria: "Adulto", valor_individual: 3848 }],
  criancas: [],
  parcelas: [
    { cpf: "cpf1", numero_parcela: 1, valor_parcela: 1282.66 },
    { cpf: "cpf1", numero_parcela: 2, valor_parcela: 1282.66 },
    { cpf: "cpf1", numero_parcela: 3, valor_parcela: 1282.68 },
    { cpf: "cpf2", numero_parcela: 1, valor_parcela: 999 },
  ],
};

test("renderiza o pedido com escape, parcelas do responsável e alternativa em texto", async () => {
  const email = await montarEmailConfirmacaoCadastro({ cadastro, idPedido: "1234567890", evento: { data_evento: "2027-04-27" } });
  assert.equal(email.para.address, "responsavel@example.com");
  assert.match(email.assunto, /1234567890/);
  assert.match(email.html, /Empresa &amp; Filhos/);
  assert.match(email.html, /&lt;img/);
  assert.doesNotMatch(email.html, /<img/);
  assert.doesNotMatch(email.html.split("<body")[1], /\{\{\w+\}\}/);
  assert.match(email.html, /#f79400/);
  assert.match(email.texto, /27\/04\/2027/);
  assert.match(email.texto, /7\.696,00/);
  assert.match(email.texto, /1\.282,68/);
  assert.doesNotMatch(email.texto, /999,00/);
  assert.match(email.texto, /Acompanhante/);
});

function resposta() {
  return { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

function dependencias(alteracoes = {}) {
  return {
    preparar: () => cadastro,
    consultarEvento: async () => ({ data_evento: "2099-04-27" }),
    gerarCodigo: async () => "1234567890",
    gravarCadastro: async () => ({}),
    enviarConfirmacao: async () => {},
    ...alteracoes,
  };
}

test("envia a confirmação somente após a gravação do cadastro", async () => {
  const ordem = [];
  const hook = criarHookCadastro(dependencias({
    gravarCadastro: async (payload) => { ordem.push("gravar"); assert.equal(payload.id_pedido, "1234567890"); return {}; },
    enviarConfirmacao: async (dados) => { ordem.push("email"); assert.equal(dados.cadastro, cadastro); assert.equal(dados.idPedido, "1234567890"); },
  }));
  const res = resposta();
  await hook({ body: {} }, res);
  assert.deepEqual(ordem, ["gravar", "email"]);
  assert.equal(res.code, 200);
  assert.equal(res.body.email_enviado, true);
});

test("falha SMTP mantém o cadastro confirmado e sinaliza envio malsucedido", async () => {
  const hook = criarHookCadastro(dependencias({ enviarConfirmacao: async () => { throw new Error("SMTP indisponível"); } }));
  const res = resposta();
  await hook({ body: {} }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.id_pedido, "1234567890");
  assert.equal(res.body.email_enviado, false);
});

test("não envia email quando o cadastro falha ou o evento está indisponível", async () => {
  for (const alteracoes of [
    { gravarCadastro: async () => "status500" },
    { consultarEvento: async () => null },
  ]) {
    let envios = 0;
    const hook = criarHookCadastro(dependencias({ ...alteracoes, enviarConfirmacao: async () => { envios += 1; } }));
    const res = resposta();
    await hook({ body: {} }, res);
    assert.ok(res.code >= 400);
    assert.equal(envios, 0);
  }
});
