export const DATA_CHECKIN_EVENTO = "2027-04-27";
export const NOME_EVENTO_ATIVO = "teste";

const VALOR_ADULTO_SINGLE = 568_000;
const VALOR_ADULTO_COMPARTILHADO = 384_800;
const VALOR_CRIANCA_4_A_11 = 206_400;
const OCUPACAO_POR_QUARTO = {
  SINGLE: 1,
  DUPLO: 2,
  TRIPLO: 3,
};

export class ErroValidacaoCadastro extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = "ErroValidacaoCadastro";
  }
}

function textoObrigatorio(valor, campo) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new ErroValidacaoCadastro(`O campo ${campo} é obrigatório`);
  }

  return valor.trim();
}

function dataIso(valor, campo) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErroValidacaoCadastro(`O campo ${campo} deve estar no formato AAAA-MM-DD`);
  }

  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    throw new ErroValidacaoCadastro(`O campo ${campo} contém uma data inválida`);
  }

  return data;
}

function dataIsoOpcional(valor, campo) {
  if (valor === null || valor === undefined || valor === "") return null;
  dataIso(valor, campo);
  return valor;
}

function emailValido(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cpfValido(cpf) {
  const valor = String(cpf ?? "");

  if (!/^\d{11}$/.test(valor) || /^(\d)\1{10}$/.test(valor)) return false;

  const calcularDigito = (tamanho) => {
    let soma = 0;
    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(valor[indice]) * (tamanho + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(valor[9]) && calcularDigito(10) === Number(valor[10]);
}

export function calcularIdadeNaData(dataNascimento, dataReferencia = DATA_CHECKIN_EVENTO) {
  const nascimento = dataIso(dataNascimento, "data_nascimento");
  const referencia = dataIso(dataReferencia, "data de referência");
  let idade = referencia.getUTCFullYear() - nascimento.getUTCFullYear();

  if (
    referencia.getUTCMonth() < nascimento.getUTCMonth() ||
    (referencia.getUTCMonth() === nascimento.getUTCMonth() &&
      referencia.getUTCDate() < nascimento.getUTCDate())
  ) {
    idade -= 1;
  }

  if (idade < 0) {
    throw new ErroValidacaoCadastro("A data de nascimento não pode ser posterior ao evento");
  }

  return idade;
}

export function classificarParticipante(idade, tipoQuarto) {
  if (idade <= 3) {
    return { categoria: "Criança de 0 a 3 anos", valorCentavos: 0 };
  }

  if (idade <= 11) {
    return {
      categoria: "Criança de 4 a 11 anos",
      valorCentavos: VALOR_CRIANCA_4_A_11,
    };
  }

  return {
    categoria: "Adulto",
    valorCentavos:
      tipoQuarto === "SINGLE" ? VALOR_ADULTO_SINGLE : VALOR_ADULTO_COMPARTILHADO,
  };
}

export function valorParaCentavos(valor, campo = "valor_total") {
  const texto = String(valor ?? "").trim().replace(",", ".");
  const correspondencia = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto);

  if (!correspondencia) {
    throw new ErroValidacaoCadastro(`O campo ${campo} deve ser um valor monetário válido`);
  }

  const reais = Number(correspondencia[1]);
  const centavos = Number((correspondencia[2] ?? "").padEnd(2, "0"));
  const total = reais * 100 + centavos;

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new ErroValidacaoCadastro(`O campo ${campo} deve ser positivo`);
  }

  return total;
}

export function centavosParaValor(centavos) {
  return Number((centavos / 100).toFixed(2));
}

export function dividirEmParcelas(totalCentavos, quantidadeParcelas) {
  const valorBase = Math.floor(totalCentavos / quantidadeParcelas);
  const diferenca = totalCentavos - valorBase * quantidadeParcelas;

  return Array.from({ length: quantidadeParcelas }, (_, indice) =>
    indice === quantidadeParcelas - 1 ? valorBase + diferenca : valorBase,
  );
}

function validarContato({ cpf, email, telefone }, prefixo) {
  if (!cpfValido(cpf)) {
    throw new ErroValidacaoCadastro(`O CPF informado em ${prefixo} é inválido`);
  }

  if (!emailValido(email)) {
    throw new ErroValidacaoCadastro(`O e-mail informado em ${prefixo} é inválido`);
  }

  if (telefone !== undefined && telefone !== null && !/^\d{1,12}$/.test(String(telefone))) {
    throw new ErroValidacaoCadastro(
      `O telefone informado em ${prefixo} deve conter somente números e no máximo 12 dígitos`,
    );
  }
}

function criarParcelas(cpf, totalCentavos, quantidadeParcelas, parcelaValida) {
  return dividirEmParcelas(totalCentavos, quantidadeParcelas).map(
    (valorCentavos, indice) => ({
      cpf,
      numero_parcela: indice + 1,
      valor_parcela: centavosParaValor(valorCentavos),
      parcela_paga: false,
      parcela_valida: parcelaValida,
    }),
  );
}

export function prepararCadastro(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ErroValidacaoCadastro("O corpo da requisição é inválido");
  }

  const cnpj = String(payload.cnpj ?? "");
  const cep = String(payload.cep ?? "");

  if (!/^\d{14}$/.test(cnpj)) {
    throw new ErroValidacaoCadastro("O CNPJ deve conter exatamente 14 dígitos");
  }
  if (!/^\d{8}$/.test(cep)) {
    throw new ErroValidacaoCadastro("O CEP deve conter exatamente 8 dígitos");
  }

  const tipoQuarto = String(payload.tipo_quarto ?? "").toUpperCase();
  if (!Object.hasOwn(OCUPACAO_POR_QUARTO, tipoQuarto)) {
    throw new ErroValidacaoCadastro("O tipo_quarto deve ser SINGLE, DUPLO ou TRIPLO");
  }
  const preferenciaCama = textoObrigatorio(
    payload.preferencia_cama,
    "preferencia_cama",
  ).toUpperCase();
  if (preferenciaCama.length > 30) {
    throw new ErroValidacaoCadastro(
      "O campo preferencia_cama deve possuir no máximo 30 caracteres",
    );
  }
  if (typeof payload.divisao_pagamento !== "boolean") {
    throw new ErroValidacaoCadastro("O campo divisao_pagamento deve ser booleano");
  }
  if (typeof payload.enviou_convite !== "boolean") {
    throw new ErroValidacaoCadastro("O campo enviou_convite deve ser booleano");
  }

  const quantidadeParcelas = Number(payload.quantidade_parcelas);
  if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas < 1 || quantidadeParcelas > 8) {
    throw new ErroValidacaoCadastro("A quantidade_parcelas deve ser um inteiro entre 1 e 8");
  }

  if (!Array.isArray(payload.clientes) || payload.clientes.length === 0) {
    throw new ErroValidacaoCadastro("Informe pelo menos um cliente");
  }
  if (payload.clientes.length !== OCUPACAO_POR_QUARTO[tipoQuarto]) {
    throw new ErroValidacaoCadastro(
      `O quarto ${tipoQuarto} deve possuir exatamente ${OCUPACAO_POR_QUARTO[tipoQuarto]} cliente(s) adulto(s)`,
    );
  }
  if (payload.divisao_pagamento && payload.clientes.length < 2) {
    throw new ErroValidacaoCadastro(
      "A divisão de pagamento exige um segundo cliente",
    );
  }

  const criancasOriginais = payload.criancas ?? [];
  if (!Array.isArray(criancasOriginais) || criancasOriginais.length > 2) {
    throw new ErroValidacaoCadastro("O campo criancas deve ser uma lista com no máximo dois registros");
  }
  if (!Array.isArray(payload.transfer) || payload.transfer.length !== 1) {
    throw new ErroValidacaoCadastro("O campo transfer deve possuir exatamente um registro");
  }

  const clientes = payload.clientes.map((cliente, indice) => {
    if (!cliente || typeof cliente !== "object" || Array.isArray(cliente)) {
      throw new ErroValidacaoCadastro(`O registro clientes[${indice}] é inválido`);
    }
    const nome = textoObrigatorio(cliente.nome, `clientes[${indice}].nome`);
    const telefone = String(cliente.telefone ?? "");
    const segundoClienteDivisao = payload.divisao_pagamento && indice === 1;

    if (!/^\d{1,12}$/.test(telefone)) {
      throw new ErroValidacaoCadastro(
        `O telefone informado em clientes[${indice}] deve conter somente números e no máximo 12 dígitos`,
      );
    }

    if (segundoClienteDivisao) {
      const cpfInformado = cliente.cpf !== undefined && cliente.cpf !== null && cliente.cpf !== "";
      const emailInformado =
        cliente.email !== undefined && cliente.email !== null && cliente.email !== "";
      const nascimentoInformado =
        cliente.data_nascimento !== undefined &&
        cliente.data_nascimento !== null &&
        cliente.data_nascimento !== "";

      if (cpfInformado && !cpfValido(cliente.cpf)) {
        throw new ErroValidacaoCadastro(
          `O CPF informado em clientes[${indice}] é inválido`,
        );
      }
      if (emailInformado && !emailValido(cliente.email)) {
        throw new ErroValidacaoCadastro(
          `O e-mail informado em clientes[${indice}] é inválido`,
        );
      }
      if (
        cliente.participa_auditorio !== undefined &&
        cliente.participa_auditorio !== null &&
        typeof cliente.participa_auditorio !== "boolean"
      ) {
        throw new ErroValidacaoCadastro(
          `O campo participa_auditorio de clientes[${indice}] deve ser booleano`,
        );
      }

      let idadeEvento = null;
      if (nascimentoInformado) {
        idadeEvento = calcularIdadeNaData(cliente.data_nascimento);
        if (idadeEvento < 12) {
          throw new ErroValidacaoCadastro(
            `O participante clientes[${indice}] deve possuir 12 anos ou mais na data do evento`,
          );
        }
      }

      const classificacao = classificarParticipante(idadeEvento ?? 12, tipoQuarto);

      return {
        ...cliente,
        nome,
        nome_cracha: cliente.nome_cracha ?? null,
        cpf: cpfInformado ? String(cliente.cpf) : null,
        email: emailInformado ? cliente.email : null,
        data_nascimento: nascimentoInformado ? cliente.data_nascimento : null,
        telefone,
        tm_camiseta: cliente.tm_camiseta ?? null,
        tm_chinelo: cliente.tm_chinelo ?? null,
        participa_auditorio: cliente.participa_auditorio ?? null,
        idade_evento: idadeEvento,
        categoria: classificacao.categoria,
        valor_individual: centavosParaValor(classificacao.valorCentavos),
        valor_individual_centavos: classificacao.valorCentavos,
      };
    }

    textoObrigatorio(cliente.data_nascimento, `clientes[${indice}].data_nascimento`);
    validarContato(cliente, `clientes[${indice}]`);
    if (typeof cliente.participa_auditorio !== "boolean") {
      throw new ErroValidacaoCadastro(
        `O campo participa_auditorio de clientes[${indice}] deve ser booleano`,
      );
    }

    const idadeEvento = calcularIdadeNaData(cliente.data_nascimento);
    if (idadeEvento < 12) {
      throw new ErroValidacaoCadastro(
        `O participante clientes[${indice}] deve possuir 12 anos ou mais na data do evento`,
      );
    }
    const classificacao = classificarParticipante(idadeEvento, tipoQuarto);

    return {
      ...cliente,
      nome,
      cpf: String(cliente.cpf),
      telefone,
      idade_evento: idadeEvento,
      categoria: classificacao.categoria,
      valor_individual: centavosParaValor(classificacao.valorCentavos),
      valor_individual_centavos: classificacao.valorCentavos,
    };
  });

  const responsavel = clientes[0];

  if (payload.enviou_convite) {
    textoObrigatorio(payload.nome_convidado, "nome_convidado");
    if (!cpfValido(payload.cpf_convidado)) {
      throw new ErroValidacaoCadastro("O CPF informado em cpf_convidado é inválido");
    }
    if (!emailValido(payload.email_convidado)) {
      throw new ErroValidacaoCadastro("O e-mail informado em email_convidado é inválido");
    }
    if (
      payload.cnpj_convidado !== undefined &&
      !/^\d{14}$/.test(String(payload.cnpj_convidado))
    ) {
      throw new ErroValidacaoCadastro("O cnpj_convidado deve conter exatamente 14 dígitos");
    }
  }

  const criancas = criancasOriginais.map((crianca, indice) => {
    if (!crianca || typeof crianca !== "object" || Array.isArray(crianca)) {
      throw new ErroValidacaoCadastro(`O registro criancas[${indice}] é inválido`);
    }
    textoObrigatorio(crianca.nome_crianca, `criancas[${indice}].nome_crianca`);
    textoObrigatorio(crianca.data_nascimento, `criancas[${indice}].data_nascimento`);
    validarContato(
      { cpf: crianca.cpf_crianca, email: crianca.email },
      `criancas[${indice}]`,
    );
    const idadeEvento = calcularIdadeNaData(crianca.data_nascimento);
    const classificacao = classificarParticipante(idadeEvento, tipoQuarto);

    return {
      ...crianca,
      cpf_crianca: String(crianca.cpf_crianca),
      idade_evento: idadeEvento,
      categoria: classificacao.categoria,
      valor_individual: centavosParaValor(classificacao.valorCentavos),
      valor_individual_centavos: classificacao.valorCentavos,
      nome_responsavel: responsavel.nome,
      cpf_responsavel: responsavel.cpf,
      email_responsavel: responsavel.email,
      telefone_responsavel: responsavel.telefone,
    };
  });

  const cpfs = [
    ...clientes.map((cliente) => cliente.cpf),
    ...criancas.map((crianca) => crianca.cpf_crianca),
  ].filter((cpf) => cpf !== null && cpf !== undefined && cpf !== "");
  if (new Set(cpfs).size !== cpfs.length) {
    throw new ErroValidacaoCadastro("Não são permitidos CPFs duplicados entre clientes e crianças");
  }

  const valorCalculadoCentavos = [...clientes, ...criancas].reduce(
    (total, participante) => total + participante.valor_individual_centavos,
    0,
  );
  const valorRecebidoCentavos = valorParaCentavos(payload.valor_total);
  if (valorRecebidoCentavos !== valorCalculadoCentavos) {
    throw new ErroValidacaoCadastro(
      `O valor_total informado diverge do valor calculado pelo backend: R$ ${centavosParaValor(valorCalculadoCentavos).toFixed(2)}`,
    );
  }

  const transfer = payload.transfer.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ErroValidacaoCadastro("O registro transfer[0] é inválido");
    }

    return {
      data_embarque: dataIsoOpcional(item.data_embarque, "transfer[0].data_embarque"),
      regiao_embarque: item.regiao_embarque ?? null,
      horario_embarque: item.horario_embarque ?? null,
      data_desembarque: dataIsoOpcional(item.data_desembarque, "transfer[0].data_desembarque"),
      regiao_desembarque: item.regiao_desembarque ?? null,
      horario_desembarque: item.horario_desembarque ?? null,
    };
  });

  const parcelas = [];
  if (payload.divisao_pagamento) {
    const valorCriancas = criancas.reduce(
      (total, crianca) => total + crianca.valor_individual_centavos,
      0,
    );
    clientes.forEach((cliente, indice) => {
      const totalCliente =
        cliente.valor_individual_centavos + (indice === 0 ? valorCriancas : 0);
      parcelas.push(
        ...criarParcelas(cliente.cpf, totalCliente, quantidadeParcelas, indice === 0),
      );
    });
  } else {
    parcelas.push(
      ...criarParcelas(responsavel.cpf, valorCalculadoCentavos, quantidadeParcelas, true),
    );
  }

  const removerCentavosInternos = ({ valor_individual_centavos, ...participante }) =>
    participante;

  return {
    ...payload,
    nome_evento: 'encontro_franqueados_2027',
    cnpj,
    cep,
    razao_social: textoObrigatorio(payload.razao_social, "razao_social"),
    endereco: textoObrigatorio(payload.endereco, "endereco"),
    complemento: textoObrigatorio(payload.complemento, "complemento"),
    bairro: textoObrigatorio(payload.bairro, "bairro"),
    cidade: textoObrigatorio(payload.cidade, "cidade"),
    uf: textoObrigatorio(payload.uf, "uf"),
    tipo_quarto: tipoQuarto,
    preferencia_cama: preferenciaCama,
    quantidade_parcelas: quantidadeParcelas,
    valor_total: centavosParaValor(valorCalculadoCentavos),
    clientes: clientes.map(removerCentavosInternos),
    criancas: criancas.map(removerCentavosInternos),
    transfer,
    parcelas,
  };
}
