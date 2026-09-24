import { readFile } from "node:fs/promises";
import { enviarEmail } from "./email.js";

const templateUrl = new URL("../templates/email/base.html", import.meta.url);
const moeda = (valor) => Number(valor).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL",
});
const data = (valor) => valor ? String(valor).slice(0, 10).split("-").reverse().join("/") : "Não informado";
const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[caractere]);

export async function montarEmailConfirmacaoCadastro({ cadastro, idPedido, evento }) {
  const responsavel = cadastro.clientes[0];
  const participantes = [...cadastro.clientes, ...cadastro.acompanhantes, ...cadastro.criancas];
  const linhas = [
    `Pedido: ${idPedido}`,
    `Evento: ${cadastro.nome_evento.replaceAll("_", " ")}`,
    `Data do evento: ${data(evento.data_evento)}`,
    `Empresa: ${cadastro.razao_social}`,
    `Quarto: ${cadastro.tipo_quarto}`,
    `Preferência de cama: ${cadastro.preferencia_cama}`,
    "",
    "Participantes:",
    ...participantes.map((p) => `${p.nome ?? p.nome_crianca} — ${p.categoria}: ${moeda(p.valor_individual)}`),
    "",
    `Valor total do pedido: ${moeda(cadastro.valor_total)}`,
    `Pagamento: ${cadastro.quantidade_parcelas} parcela(s)`,
    `Divisão de pagamento: ${cadastro.divisao_pagamento ? "Sim" : "Não"}`,
    "Parcelas do responsável (incluindo crianças, quando houver):",
    ...cadastro.parcelas.filter((p) => p.cpf === responsavel.cpf)
      .map((p) => `${p.numero_parcela}ª parcela: ${moeda(p.valor_parcela)}`),
    "",
    "Esta mensagem confirma o cadastro. A confirmação de pagamento é realizada separadamente.",
  ];
  const campos = {
    titulo: "Confirmação de cadastro",
    preheader: `Cadastro confirmado! Confira as informações do pedido ${idPedido}.`,
    destinatario: responsavel.nome,
    mensagem: "Seu cadastro foi realizado com sucesso! Confira abaixo as informações do seu pedido e guarde o código para consultas.",
    complemento: linhas.join("\n"),
    equipe: "Equipe de Tecnologia Giraffas",
  };
  const template = await readFile(templateUrl, "utf8");
  const html = template.replace(/\{\{(\w+)\}\}/g, (marcador, chave) => {
    if (!Object.hasOwn(campos, chave)) return marcador;
    const valor = escapar(campos[chave]);
    return chave === "complemento" ? valor.replace(/\r?\n/g, "<br>") : valor;
  });
  return {
    para: { name: responsavel.nome, address: responsavel.email },
    assunto: `Confirmação de cadastro — Pedido ${idPedido}`,
    texto: `Olá, ${responsavel.nome}!\n\n${campos.mensagem}\n\n${campos.complemento}\n\nAtenciosamente,\n${campos.equipe}`,
    html,
  };
}

export async function enviarConfirmacaoCadastro(dados) {
  const resultado = await enviarEmail(await montarEmailConfirmacaoCadastro(dados));
  if (!resultado.accepted?.length || resultado.rejected?.length) {
    throw new Error("O servidor SMTP não aceitou o destinatário da confirmação");
  }
  return resultado;
}
