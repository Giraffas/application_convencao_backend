# Application Eventos — Backend

API HTTP responsável pelos fluxos de inscrição, pedidos, pagamentos, convites e administração de eventos. O serviço é construído com Node.js e Express, utiliza o Supabase como camada de dados e gera tokens JWT para os fluxos de identificação e login administrativo.

> Este documento descreve o comportamento observado no código atual. A seção [Estado atual e débitos técnicos](#estado-atual-e-débitos-técnicos) registra limitações que devem ser consideradas antes de disponibilizar a API em produção.

## Sumário

- [Visão geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Configuração local](#configuração-local)
- [Deploy com Docker Compose](#deploy-com-docker-compose)
- [Banco de dados](#banco-de-dados)
- [Autenticação](#autenticação)
- [Convenções da API](#convenções-da-api)
- [Endpoints](#endpoints)
- [Fluxos de negócio](#fluxos-de-negócio)
- [Regras de negócio](#regras-de-negócio)
- [Segurança](#segurança)
- [Estado atual e débitos técnicos](#estado-atual-e-débitos-técnicos)
- [Solução de problemas](#solução-de-problemas)

## Visão geral

O backend atende dois grupos principais de consumidores:

- participantes, que realizam inscrição, consultam cadastro, alteram datas, cancelam participação e resgatam convites;
- administradores, que consultam clientes e parcelas, reativam inscrições, alteram pedidos e confirmam pagamentos.

O fluxo principal de cadastro persiste dados em várias tabelas do Supabase:

1. valida a antecedência do evento;
2. gera um código de pedido de dez dígitos;
3. cadastra a empresa;
4. cadastra o responsável e seus acompanhantes;
5. registra crianças vinculadas ao responsável;
6. cria pedidos para os participantes;
7. gera as parcelas de pagamento.

## Tecnologias

| Componente | Uso |
| --- | --- |
| Node.js | Runtime do backend |
| Express 5 | Servidor HTTP e roteamento |
| `@supabase/supabase-js` | Acesso ao PostgreSQL por meio da Data API do Supabase |
| `jsonwebtoken` | Geração de tokens JWT |
| `dotenv` | Carregamento de variáveis de ambiente |
| `cors` | Liberação de requisições entre origens |

O projeto utiliza módulos ES (`"type": "module"`).

## Arquitetura

```text
backend/
├── controllers/            # Consultas e mutações no Supabase
├── database/
│   ├── supabase.js         # Criação do cliente Supabase
│   └── liberar_tabelas_giraffas_homolog.sql
├── functions/              # Funções auxiliares
├── hooks/                  # Orquestração dos fluxos de negócio
├── middleware/             # Validação dos tokens JWT
├── routes/
│   └── router.js           # Registro das rotas HTTP
├── supabase/migrations/    # Evolução versionada do banco
├── tests/                  # Testes automatizados
├── Dockerfile
├── compose.yml
├── server.js               # Inicialização do Express
├── package.json
└── README.md
```

### Responsabilidades por camada

- `server.js`: configura CORS, parsing JSON/URL-encoded e registra o router.
- `routes/router.js`: associa método e caminho HTTP a controllers ou hooks e separa as rotas públicas das protegidas.
- `middleware/authMidlleware.js`: valida o Bearer token das rotas protegidas.
- `hooks/`: valida payloads e coordena operações compostas.
- `controllers/`: executa uma consulta ou mutação específica no Supabase.
- `functions/`: contém regras auxiliares, como datas, parcelas, código do pedido, JWT e preparação do cadastro.
- `database/supabase.js`: cria o cliente a partir de `SUPABASE_URL` e `SUPABASE_KEY`.

## Configuração local

### Pré-requisitos

- Node.js com suporte a `node --watch`;
- npm;
- projeto Supabase acessível;
- schema e tabelas descritos neste documento.

### Instalação

```bash
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz:

```dotenv
SERVER_PORT=5000
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_KEY=SUA_CHAVE_DE_BACKEND
AMBIENT=GIRAFFAS_HOMOLOG
JWT_SECRET=SEGREDO_FORTE_E_ALEATORIO
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `SERVER_PORT` | Sim | Porta HTTP usada pelo Express |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_KEY` | Sim | Chave utilizada exclusivamente pelo backend |
| `AMBIENT` | Sim | Schema consultado, por exemplo `GIRAFFAS_HOMOLOG` |
| `JWT_SECRET` | Sim | Segredo utilizado para assinar tokens HS256 |

Não versione o `.env`. Uma chave `service_role` nunca deve ser enviada ao frontend, registrada em logs ou incluída em imagens Docker.

### Execução

```bash
npm start
```

O script executa:

```bash
node --watch server.js
```

Com `SERVER_PORT=5000`, a URL local é:

```text
http://179.198.123.120:5000
```

### Testes automatizados

Execute a suíte com o test runner nativo do Node.js:

```bash
npm test
```

Os testes em `tests/cadastroEvento.test.js` cobrem a preparação do cadastro,
incluindo ocupação dos quartos, acompanhantes, crianças, valores fixos, divisão
de parcelas e detecção de CPFs duplicados.

## Deploy com Docker Compose

O Compose executa o servidor Node.js continuamente. A política `restart: unless-stopped` reinicia o backend se o processo terminar com erro ou se o host for reiniciado, exceto quando o container for interrompido manualmente.

### Preparar a rede externa

Crie a rede uma única vez no host, caso ela ainda não exista:

```bash
docker network create automacoes-ti-internal
```

### Construir e iniciar o container

Prepare os diretórios persistentes no host Linux:

```bash
mkdir -p logs data
sudo chown -R 10001:10001 logs data
```

Em seguida, construa e inicie o serviço:

```bash
docker compose -f compose.yml up -d --build
```

O Compose:

- constrói a imagem a partir do `Dockerfile`;
- executa processos com o usuário não-root `10001:10001`;
- carrega as variáveis do arquivo `.env` em runtime;
- publica a porta definida em `SERVER_PORT`;
- monta `./logs` e `./data` como diretórios persistentes;
- conecta o serviço à rede externa `automacoes-ti-internal`;
- executa `node /app/server.js` como processo principal;
- mantém o serviço ativo com `restart: unless-stopped`.

### Ciclo de vida do serviço

O comando principal do container é:

```bash
node /app/server.js
```

Esse backend é um serviço HTTP permanente e não depende de um agendamento do Ofelia para iniciar. O Ofelia pode continuar sendo utilizado no mesmo ambiente para tarefas agendadas independentes.

### Verificação

```bash
docker compose -f compose.yml ps
docker logs application-eventos-backend
```

Depois que o container estiver saudável e em execução, a API fica disponível em:

```text
http://179.198.123.120:5000
```

Se `SERVER_PORT` tiver outro valor, substitua `5000` pela porta configurada.

## Banco de dados

Todas as consultas utilizam o schema definido por `AMBIENT`.

### Entidades utilizadas

| Relação | Responsabilidade |
| --- | --- |
| `EV_CADASTRO_CLIENTES` | Dados de anfitriões e convidados |
| `EV_ACOMPANHANTES` | Acompanhantes vinculados ao anfitrião e ao pedido |
| `EV_CADASTRO_CNPJ` | Cadastro de empresas |
| `EV_CADASTRO_CRIANCA` | Crianças vinculadas a um responsável |
| `EV_CADASTRO_QUARTOS` | Cadastro de quartos; atualmente não há endpoint implementado |
| `EV_DATA_EVENTO` | Data e status dos eventos |
| `EV_PEDIDOS` | Reservas e dados de embarque |
| `EV_PARCELAS_PGTO` | Parcelas e seus estados de validade/pagamento |
| `EV_REGISTRO_CONVITES` | Relação entre anfitrião e convidado |
| `EV_USUARIOS_ADMINISTRATIVOS` | Credenciais administrativas |
| `vw_ev_analise_financeira` | View consultada pela listagem financeira |

O arquivo `database/liberar_tabelas_giraffas_homolog.sql` concede ao papel `service_role` uso do schema e operações CRUD nas tabelas do ambiente de homologação.

### Identificador de pedido

`functions/geraCodigoPedido.js` usa `crypto.randomInt()` para gerar uma string numérica com dez dígitos, entre `1000000000` e `9999999999`. Antes do cadastro, `GET_conferenciaCodigoPedido.js` verifica se o identificador já existe em `EV_PEDIDOS`.

Mantenha `id_pedido` como texto ou `bigint`. O tipo PostgreSQL `integer` não comporta todos os valores de dez dígitos.

## Autenticação

O projeto gera JWTs com:

- algoritmo `HS256`;
- emissor `application-eventos`;
- audiência `application-eventos-api`;
- expiração de 30 horas;
- `subject` derivado do usuário informado à função.

Dois endpoints geram tokens:

- `POST /posts/auth/loginaadministrator`;
- `POST /posts/consultas/consultainscricao`.

### Utilização do token

O middleware JWT é aplicado em `routes/router.js`. Envie o token nas rotas protegidas usando exatamente este formato:

```http
Authorization: Bearer SEU_TOKEN
```

Exemplo:

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  http://179.198.123.120:5000/sellers/all/sellersall
```

O middleware atual valida a assinatura e a expiração com `JWT_SECRET`. Os claims `issuer`, `audience` e `algorithm` são definidos na geração, mas ainda não são informados explicitamente como restrições no `jwt.verify()`.

### Rotas públicas

As seguintes rotas são registradas antes do middleware:

- `POST /posts/auth/loginaadministrator`;
- `POST /hooks/autocompletecnpj`;
- `POST /posts/consultas/consultainscricao`;
- `POST /hooks/cadastro`.

Todas as rotas declaradas depois de `router.use(authMiddleware)` exigem Bearer token. Isso inclui o alias `POST /hooks/cadastroevento`.

## Convenções da API

### Formato

- Content-Type: `application/json`;
- identificadores como CPF, CNPJ, CEP, telefone e `id_pedido` devem ser enviados como strings;
- datas são enviadas em `YYYY-MM-DD`;
- os filtros Supabase encadeados são combinados por `AND`, exceto quando `.or()` é utilizado explicitamente.

### Resposta de sucesso atual

```json
{
  "sucess": true,
  "mensagem": "Operação realizada com sucesso"
}
```

O código atual utiliza a propriedade `sucess`. Para uma futura versão, recomenda-se padronizar como `success` ou `sucesso`.

### Resposta de erro atual

```json
{
  "erro": true,
  "mensagem": "Descrição do erro"
}
```

Algumas respostas incluem `msg_erro` com detalhes do Supabase. Não exponha detalhes internos em produção.

### Códigos HTTP utilizados

| Código | Uso esperado |
| --- | --- |
| `200` | Consulta ou alteração concluída |
| `400` | Payload inválido, registro não encontrado ou erro do Supabase |
| `401` | Dados de identificação ou login inválidos |
| `500` | Exceção interna |

## Endpoints

### Resumo

| Método | Caminho | Finalidade |
| --- | --- | --- |
| GET | `/orders/paymanets/listpayments` | Lista a visão financeira de parcelas |
| GET | `/sellers/active/sellersactive` | Consulta participantes ativos |
| GET | `/sellers/inactive/sellersinactive` | Consulta participantes inativos |
| GET | `/sellers/all/sellersall` | Consulta todos os participantes |
| GET | `/events/date/dateevent` | Consulta datas de eventos |
| POST | `/posts/consultas/consultainscricao` | Confere uma inscrição e gera JWT |
| POST | `/posts/auth/loginaadministrator` | Login administrativo e geração de JWT |
| POST | `/posts/orders/modify/ordercheckingcheckou` | Atualiza informações de embarque |
| POST | `/posts/payments/administrator/check` | Marca parcela como paga |
| POST | `/posts/orders/functions/reactiveOrder` | Reativa a presença de um participante |
| POST | `/orders/filterorder/getorder` | Consulta pedidos por CPF |
| POST | `/hooks/autocompletecnpj` | Localiza empresa por CNPJ |
| POST | `/hooks/cancelaParticipacao` | Cancela pedido e presença |
| POST | `/hooks/alteraCheckout` | Altera data de saída |
| POST | `/hooks/alteraChecking` | Altera data de embarque |
| POST | `/hooks/cadastro` | Executa cadastro completo |
| POST | `/hooks/cadastroevento` | Alias protegido do cadastro completo |
| POST | `/hooks/resgateconvite` | Resgata convite e vincula empresa |
| POST | `/hooks/orders/reactiveorders` | Reativa pedido e inscrição |

> O caminho `paymanets` contém a grafia presente no código e deve ser usado dessa forma até que uma mudança versionada seja realizada.

### Consultar inscrição

`POST /posts/consultas/consultainscricao`

```json
{
  "cpf": "12345678901",
  "cnpj": "12345678000199",
  "nome": "Felipe Barbosa",
  "telefone": "61999999999",
  "email": "felipe@email.com"
}
```

A consulta aplica correspondência exata a todos os campos. Quando encontra o cadastro, retorna token e o primeiro registro em `order`.

### Login administrativo

`POST /posts/auth/loginaadministrator`

```json
{
  "email": "administrador@exemplo.com",
  "senha": "senha"
}
```

### Atualizar pedido

`POST /posts/orders/modify/ordercheckingcheckou`

```json
{
  "nome_evento": "encontro_franqueados_2027",
  "filtros": {
    "cpf": "12345678901",
    "email": "felipe@email.com"
  },
  "dados": {
    "horario_embarque": "15:30",
    "regiao_embarque": "Brasília"
  }
}
```

Somente `horario_embarque` e `regiao_embarque` são extraídos do objeto `dados` pelo código atual.

### Confirmar pagamento de parcela

`POST /posts/payments/administrator/check`

```json
{
  "cpf": "12345678901",
  "numero_parcela": 1
}
```

Atualiza `parcela_paga` para `true`. O filtro atual não inclui `id_pedido`; portanto, pode afetar parcelas de pedidos diferentes que compartilhem CPF e número.

### Reativar participante

`POST /posts/orders/functions/reactiveOrder`

```json
{
  "cpf": "12345678901",
  "email": "felipe@email.com"
}
```

Atualiza `presenca_cancelada` para `false` em `EV_CADASTRO_CLIENTES`.

### Autocomplete de CNPJ

`POST /hooks/autocompletecnpj`

```json
{
  "cnpj": "12345678000199"
}
```

### Cancelar participação

`POST /hooks/cancelaParticipacao`

```json
{
  "nome_evento": "encontro_franqueados_2027",
  "cpf": "12345678901",
  "email": "felipe@email.com"
}
```

Marca `pedido_ativo=false` em `EV_PEDIDOS` e `presenca_cancelada=true` em `EV_CADASTRO_CLIENTES`.

### Alterar checkout

`POST /hooks/alteraCheckout`

```json
{
  "nome_evento": "encontro_franqueados_2027",
  "cpf": "12345678901",
  "email": "felipe@email.com",
  "nova_data": "2026-11-15"
}
```

Atualiza `data_saida` em `EV_PEDIDOS`.

### Alterar checking

`POST /hooks/alteraChecking`

```json
{
  "nome_evento": "encontro_franqueados_2027",
  "nome": "Felipe Barbosa",
  "email": "felipe@email.com",
  "nova_data": "2026-11-10"
}
```

O hook atualmente recebe `nome`, mas o controller utiliza o primeiro argumento como filtro da coluna `cpf`. Essa inconsistência está registrada nos débitos técnicos.

### Cadastro completo

`POST /hooks/cadastro`

O cadastro é validado e recalculado pelo backend e depois enviado para uma única
função PostgreSQL. Empresa, clientes, acompanhantes, crianças, pedido, transfer
e parcelas são gravados na mesma transação. Qualquer falha provoca rollback
integral.

#### Exemplo de request

```json
{
  "nome_evento": "encontro_franqueados_2027",
  "clientes": [
    {
      "nome_evento": "encontro_franqueados_2027",
      "nome": "Felipe Barbosa",
      "nome_cracha": "Felipe",
      "cpf": "52998224725",
      "email": "felipe@email.com",
      "data_nascimento": "1995-05-20",
      "telefone": "61999999999",
      "tm_camiseta": "M",
      "tm_chinelo": "39/40",
      "participa_auditorio": true,
      "idade_evento": 31,
      "categoria": "Adulto",
      "valor_individual": 3848,
      "nome_acompanhante_quarto_duplo": null,
      "telefone_acompanhante_quarto_duplo": null,
      "nome_acompanhante_quarto_triplo": null,
      "telefone_acompanhante_quarto_triplo": null
    }
  ],
  "acompanhantes": [
    {
      "nome_evento": "encontro_franqueados_2027",
      "nome": "Maria Oliveira",
      "nome_cracha": "Maria",
      "cpf": "11144477735",
      "email": "maria@email.com",
      "data_nascimento": "1993-08-15",
      "telefone": "61988888888",
      "tm_camiseta": "P",
      "tm_chinelo": "37/38",
      "participa_auditorio": true,
      "idade_evento": 33,
      "categoria": "Adulto",
      "valor_individual": 3848,
      "cpf_anfitriao": "52998224725"
    }
  ],
  "criancas": [
    {
      "nome_crianca": "João Barbosa",
      "cpf_crianca": "12345678909",
      "data_nascimento": "2018-03-10",
      "email": "responsavel@email.com",
      "tm_camiseta": "P",
      "tm_chinelo": "35/36",
      "idade_evento": 9,
      "categoria": "Criança de 4 a 11 anos",
      "valor_individual": 2064
    }
  ],
  "cnpj": "11222333000181",
  "razao_social": "Empresa Teste LTDA",
  "cep": "70000000",
  "endereco": "Rua das Flores, 100",
  "complemento": "Não informado",
  "bairro": "Centro",
  "cidade": "Brasília",
  "uf": "DF",
  "enviou_convite": false,
  "transfer": [
    {
      "data_embarque": null,
      "regiao_embarque": "Santos Dumont - SDU",
      "horario_embarque": "14h30",
      "data_desembarque": null,
      "regiao_desembarque": "Galeão - GIG",
      "horario_desembarque": "9h30"
    }
  ],
  "tipo_quarto": "DUPLO",
  "tipo_cama": "CASAL",
  "preferencia_cama": "CASAL",
  "divisao_pagamento": false,
  "quantidade_parcelas": 4,
  "valor_total": 9760
}
```

Os campos `idade_evento`, `categoria`, `valor_individual` e `valor_total` enviados
pelo cliente não são confiados. O backend sempre os recalcula usando a data de
check-in de `27/04/2027`. O campo `valor_total` recebido é opcional e ignorado;
o valor persistido é sempre o total calculado pelo backend.

#### Exemplo de sucesso

```json
{
  "sucess": true,
  "success": true,
  "mensagem": "Cliente cadastrado com sucesso",
  "id_pedido": "8974164191",
  "pedido_origem": null
}
```

O campo legado `sucess` é mantido por compatibilidade. Novos consumidores podem
usar `success`.

#### Validações

- o backend fixa temporariamente `nome_evento` como `encontro_franqueados_2027`; qualquer outro valor enviado é ignorado;
- CNPJ deve conter 14 dígitos e CEP deve conter 8 dígitos;
- CPF deve conter 11 dígitos e passar na validação dos dígitos verificadores;
- e-mails devem possuir formato válido;
- telefone deve conter somente números e no máximo 12 dígitos;
- `quantidade_parcelas` deve ser um inteiro entre 1 e 8;
- `valor_total` recebido é opcional e ignorado; o backend calcula o total usando os valores fixos;
- `tipo_quarto` aceita somente `SINGLE`, `DUPLO` ou `TRIPLO`;
- a ocupação do quarto considera a soma das listas `clientes` e `acompanhantes`;
- os registros de `acompanhantes` são gravados em `EV_ACOMPANHANTES` e associados por `cpf_anfitriao` e `id_pedido`;
- `cpf_anfitriao` é definido pelo backend com o CPF de `clientes[0]`, independentemente do valor recebido no acompanhante;
- quando `divisao_pagamento=true`, nome e telefone são os únicos campos obrigatórios do primeiro participante secundário; os campos opcionais são validados quando informados;
- `tipo_cama` é persistido em `EV_PEDIDOS`; quando omitido, utiliza `preferencia_cama`;
- `preferencia_cama` é obrigatória, normalizada em maiúsculas e aceita até 30 caracteres;
- `divisao_pagamento`, `enviou_convite` e `participa_auditorio` são booleanos;
- `transfer` deve possuir exatamente um registro; as datas podem ser `null`;
- são permitidas no máximo duas crianças;
- CPFs não podem se repetir entre clientes, acompanhantes e crianças.

Exemplo de erro de validação:

```json
{
  "erro": true,
  "mensagem": "O quarto DUPLO deve possuir exatamente 2 participante(s) adulto(s) entre clientes e acompanhantes"
}
```

#### Hospedagem, idade e cobrança

- `SINGLE` exige exatamente um participante adulto;
- `DUPLO` exige exatamente dois participantes adultos;
- `TRIPLO` exige exatamente três participantes adultos;
- crianças não substituem os adultos exigidos pela ocupação;
- adulto em `SINGLE`: R$ 5.680,00;
- adulto em `DUPLO` ou `TRIPLO`: R$ 3.848,00;
- criança de 0 a 3 anos: R$ 0,00;
- criança de 4 a 11 anos: R$ 2.064,00;
- participante com 12 anos ou mais recebe categoria e valor de adulto.

Quando `divisao_pagamento=false`, todas as parcelas são geradas somente para o
CPF de `clientes[0]`. Quando `divisao_pagamento=true`, cada cliente e
acompanhante recebe suas próprias parcelas e o valor das crianças é somado ao
primeiro cliente. Os cálculos são feitos em centavos e a diferença de
arredondamento é aplicada à última parcela.

#### Preparação do banco

A migration `supabase/migrations/20260918143846_cadastro_evento_atomico.sql`
adiciona somente as colunas ausentes e cria a função transacional
`GIRAFFAS_HOMOLOG.cadastrar_evento(jsonb)`. A migration foi aplicada no ambiente
de homologação em 18/09/2026. Para outros ambientes, aplique o mesmo arquivo
antes de disponibilizar a rota. Confirme também que `SUPABASE_KEY` no backend é
uma chave secreta de servidor (`sb_secret_`) ou uma chave legada
`service_role`. Essa chave deve permanecer exclusivamente no servidor.

A migration `supabase/migrations/20260921143535_add_evento_hospedagem_fields.sql`
acrescenta `preferencia_cama` e `valor_total` em `EV_PEDIDOS`, garante as colunas
de hospedagem e pagamento e atualiza a função transacional para persistir esses
campos. As rotas `/hooks/cadastro` e `/hooks/cadastroevento` chamam o mesmo hook;
a primeira é pública e a segunda está posicionada depois do middleware JWT.

A migration `supabase/migrations/20260921200147_adicionar_acompanhantes_evento.sql`
adapta a tabela `EV_ACOMPANHANTES`, adiciona `tipo_cama` em `EV_PEDIDOS` e
atualiza a função transacional para gravar a lista `acompanhantes`. A migration
foi aplicada no ambiente de homologação em 21/09/2026.

### Resgatar convite

`POST /hooks/resgateconvite`

```json
{
  "nome_evento": "encontro_franqueados_2027",
  "cpf": "98765432100",
  "email_convidado": "maria@email.com",
  "email_anfitriao": "felipe@email.com",
  "cnpj": "12345678000199",
  "razao_social": "Empresa da Maria LTDA",
  "cep": "70000000",
  "endereco": "Rua Exemplo, 200",
  "complemento": "Sala 2",
  "bairro": "Centro",
  "cidade": "Brasília",
  "uf": "DF"
}
```

O hook:

1. valida a antecedência do evento;
2. marca o convite como resgatado;
3. valida as parcelas do CPF;
4. vincula o CNPJ ao cadastro do convidado;
5. insere a empresa.

## Fluxos de negócio

### Cadastro

```text
requisição
  -> valida evento e antecedência
  -> gera id_pedido único
  -> cadastra empresa
  -> cadastra anfitrião
  -> cadastra acompanhantes
  -> registra convites
  -> cadastra crianças
  -> cria pedidos
  -> gera parcelas
  -> resposta HTTP
```

### Cancelamento

```text
requisição
  -> consulta data do evento
  -> valida antecedência mínima
  -> desativa pedido
  -> marca presença como cancelada
  -> resposta HTTP
```

### Resgate de convite

```text
requisição
  -> consulta data do evento
  -> resgata convite
  -> valida parcelas do convidado
  -> vincula CNPJ
  -> cadastra empresa
  -> resposta HTTP
```

## Regras de negócio

### Antecedência do evento

Cadastro, alteração, cancelamento e resgate usam `calculaData()` para impedir operações com menos de 30 dias de antecedência.

Atualmente a função usa diferença absoluta (`Math.abs`). Isso significa que uma data passada distante também pode resultar em mais de 30 dias. Antes de produção, valide explicitamente que a data do evento é futura.

### Parcelamento

- cada parcela inicia com `parcela_paga=false`;
- quando não há divisão, todas as parcelas ficam vinculadas ao CPF de `clientes[0]`;
- quando há divisão, cada cliente e acompanhante recebe parcelas sobre seu valor individual;
- o valor das crianças é somado às parcelas do responsável;
- a primeira pessoa recebe `parcela_valida=true` e os demais participantes recebem `false`;
- a diferença de arredondamento é aplicada à última parcela;
- valores monetários devem ser armazenados em `numeric`, e não em `smallint` ou ponto flutuante.

### Cancelamento e reativação

- cancelamento: `EV_PEDIDOS.pedido_ativo=false` e `EV_CADASTRO_CLIENTES.presenca_cancelada=true`;
- reativação atual: altera apenas `presenca_cancelada=false`.

## Segurança

- mantenha `SUPABASE_KEY` somente no servidor;
- habilite RLS nas tabelas expostas e crie políticas específicas por operação;
- lembre que `UPDATE` com RLS também exige uma política de `SELECT` aplicável;
- não retorne erros internos do banco ao cliente em produção;
- armazene senhas administrativas com hash resistente, como bcrypt ou Argon2;
- aplique validação JWT e autorização por perfil nas rotas;
- não use dados enviados no body como única prova de propriedade do recurso;
- valide e normalize CPF, CNPJ, e-mail, datas e valores antes das consultas;
- configure origens específicas no CORS em produção.

## Estado atual e débitos técnicos

Os itens abaixo foram identificados diretamente no código atual:

1. Login e consulta de inscrição ainda tratam o retorno em array como objeto ao gerar o token; isso pode produzir `sub="undefined"`.
2. A senha administrativa é comparada diretamente no banco; não há hash de senha.
3. Vários handlers antigos enviam `res.status(...).json(...)` sem `return`, o que pode gerar `ERR_HTTP_HEADERS_SENT`.
4. As consultas de clientes ativos e inativos não enviam resposta de sucesso após encontrar dados.
5. Alguns updates usam apenas CPF/e-mail e podem modificar vários pedidos do mesmo participante.
6. A confirmação de parcela usa CPF e número da parcela, sem filtrar `id_pedido`.
7. O cadastro completo é transacional, mas cancelamento, reativação e resgate de convite ainda executam mutações separadas.
8. `calculaData()` usa diferença absoluta e não rejeita explicitamente eventos passados.
9. O middleware verifica assinatura e expiração, mas não restringe explicitamente emissor, audiência e algoritmo.
10. O carregamento de `.env` é repetido em diversos módulos, em vez de ocorrer apenas no bootstrap.
11. Há imports não utilizados de APIs internas do Supabase em alguns controllers.
12. Não existem scripts de lint e formatação no `package.json`.

### Prioridade recomendada

1. corrigir retornos HTTP e a geração dos claims JWT;
2. adicionar autorização por perfil e hash de senha;
3. tornar os demais fluxos compostos transacionais;
4. restringir updates por `id_pedido` e identidade autenticada;
5. ampliar os testes de integração das rotas;
6. padronizar nomes de rotas e respostas em uma versão nova da API.

## Solução de problemas

### `ERR_HTTP_HEADERS_SENT`

Uma resposta foi enviada, mas a função continuou executando. Use `return`:

```js
return res.status(400).json({
  erro: true,
  mensagem: "Payload inválido"
});
```

### Update retorna array vazio sem erro

Verifique:

- valores e tipos dos filtros;
- schema configurado em `AMBIENT`;
- existência do registro;
- políticas RLS de `SELECT` e `UPDATE`;
- uso da chave correta exclusivamente no backend.

### `PGRST204`

O campo enviado não existe no cache de schema da tabela. Confirme o nome exato da coluna e atualize o cache do PostgREST após alterações de schema.

### `PGRST205`

A tabela não foi encontrada no schema selecionado. Confira `AMBIENT`, o nome da tabela e a exposição do schema na Data API.

### `PGRST116`

Foi solicitado um único objeto, mas a consulta retornou zero ou várias linhas. Revise filtros e restrições de unicidade antes de usar `.single()` ou `.maybeSingle()`.

### `ERR_CONNECTION_RESET`

O backend encerrou ou reiniciou a conexão antes de enviar JSON. Consulte primeiro o terminal do Node.js; no frontend, `error.response` pode ser `undefined` porque não houve resposta HTTP.

## Licença

O `package.json` declara licença ISC.
