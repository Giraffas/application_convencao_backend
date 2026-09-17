# Application Eventos — Backend

API HTTP responsável pelos fluxos de inscrição, pedidos, pagamentos, convites e administração de eventos. O serviço é construído com Node.js e Express, utiliza o Supabase como camada de dados e gera tokens JWT para os fluxos de identificação e login administrativo.

> Este documento descreve o comportamento observado no código atual. A seção [Estado atual e débitos técnicos](#estado-atual-e-débitos-técnicos) registra limitações que devem ser consideradas antes de disponibilizar a API em produção.

## Sumário

- [Visão geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Configuração local](#configuração-local)
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
4. cadastra anfitrião e convidados;
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
├── routes/
│   └── router.js           # Registro das rotas HTTP
├── server.js               # Inicialização do Express
├── package.json
└── README.md
```

### Responsabilidades por camada

- `server.js`: configura CORS, parsing JSON/URL-encoded e registra o router.
- `routes/router.js`: associa método e caminho HTTP a controllers ou hooks.
- `hooks/`: valida payloads e coordena operações compostas.
- `controllers/`: executa uma consulta ou mutação específica no Supabase.
- `functions/`: contém regras auxiliares, como datas, parcelas, código do pedido e JWT.
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
http://localhost:5000
```

## Banco de dados

Todas as consultas utilizam o schema definido por `AMBIENT`.

### Entidades utilizadas

| Relação | Responsabilidade |
| --- | --- |
| `EV_CADASTRO_CLIENTES` | Dados de anfitriões e convidados |
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

### Estado atual

As rotas ainda não possuem middleware de validação JWT. Portanto, embora tokens sejam emitidos, os endpoints administrativos e de participante não exigem atualmente `Authorization: Bearer <token>`.

Antes de produção, implemente um middleware que execute `jwt.verify()` validando algoritmo, emissor e audiência, e aplique autorização por perfil. Não confie somente no CPF ou e-mail enviados no corpo da requisição para determinar a propriedade de um pedido.

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
| POST | `/hooks/autocompletecnpj` | Localiza empresa por CNPJ |
| POST | `/hooks/cancelaParticipacao` | Cancela pedido e presença |
| POST | `/hooks/alteraCheckout` | Altera data de saída |
| POST | `/hooks/alteraChecking` | Altera data de embarque |
| POST | `/hooks/cadastro` | Executa cadastro completo |
| POST | `/hooks/resgateconvite` | Resgata convite e vincula empresa |

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
  "nome_evento": "teste",
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
  "nome_evento": "teste",
  "cpf": "12345678901",
  "email": "felipe@email.com"
}
```

Marca `pedido_ativo=false` em `EV_PEDIDOS` e `presenca_cancelada=true` em `EV_CADASTRO_CLIENTES`.

### Alterar checkout

`POST /hooks/alteraCheckout`

```json
{
  "nome_evento": "teste",
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
  "nome_evento": "teste",
  "nome": "Felipe Barbosa",
  "email": "felipe@email.com",
  "nova_data": "2026-11-10"
}
```

O hook atualmente recebe `nome`, mas o controller utiliza o primeiro argumento como filtro da coluna `cpf`. Essa inconsistência está registrada nos débitos técnicos.

### Cadastro completo

`POST /hooks/cadastro`

```json
{
  "nome_evento": "teste",
  "cnpj": "12345678000199",
  "razao_social": "Empresa Exemplo LTDA",
  "cep": "70000000",
  "endereco": "Rua Exemplo, 100",
  "complemento": "Sala 10",
  "bairro": "Centro",
  "cidade": "Brasília",
  "uf": "DF",
  "enviou_convite": true,
  "tipo_quarto": "DUPLO",
  "divisao_pagamento": true,
  "quantidade_parcelas": 2,
  "valor_total": 1000,
  "clientes": [
    {
      "nome": "Felipe Barbosa",
      "nome_cracha": "Felipe",
      "cpf": "12345678901",
      "email": "felipe@email.com",
      "data_nascimento": "1995-05-20",
      "telefone": "61999999999",
      "tm_camiseta": "M",
      "tm_chinelo": "40"
    },
    {
      "nome": "Maria Oliveira",
      "nome_cracha": "Maria",
      "cpf": "98765432100",
      "email": "maria@email.com",
      "data_nascimento": "1997-08-12",
      "telefone": "61988888888",
      "tm_camiseta": "P",
      "tm_chinelo": "36"
    }
  ],
  "criancas": [
    {
      "nome_crianca": "Criança Exemplo",
      "cpf_crianca": "11122233344",
      "data_nascimento": "2018-04-10"
    }
  ],
  "transfer": [
    {
      "data_embarque": "2026-11-10",
      "regiao_embarque": "Brasília",
      "horario_embarque": "15:30"
    }
  ]
}
```

Regras estruturais do payload:

- `clientes` deve ser um array não vazio;
- o primeiro cliente é tratado como responsável/anfitrião;
- os demais clientes são tratados como convidados;
- `criancas` e `transfer` são arrays opcionais;
- os dados de empresa não são repetidos em cada cliente.

### Resgatar convite

`POST /hooks/resgateconvite`

```json
{
  "nome_evento": "teste",
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
  -> cadastra anfitrião e convidados
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
- o anfitrião recebe `parcela_valida=true`;
- convidados recebem `parcela_valida=false` até o resgate;
- quando `enviou_convite=true`, o valor total é dividido inicialmente por dois e depois pela quantidade de parcelas;
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

1. Não existe middleware JWT aplicado no router.
2. Login e consulta de inscrição tratam `data` como objeto em alguns pontos, embora o Supabase retorne array sem `.single()`/`.maybeSingle()`.
3. A senha administrativa é comparada diretamente no banco; não há hash de senha.
4. Vários handlers enviam `res.status(...).json(...)` sem `return`, o que pode gerar `ERR_HTTP_HEADERS_SENT`.
5. O cadastro contém chamadas `res.status(...).jsos(...)`, que deveriam ser `.json(...)`.
6. `POST_insertPedidos.js` carrega `.ven` em vez de `.env`.
7. `postResgataConvite()` referencia `res` sem recebê-lo como parâmetro no caminho de erro.
8. `postInsertCrianca()` não retorna `true` no caminho de sucesso.
9. As consultas de clientes ativos e inativos não enviam resposta de sucesso após encontrar dados.
10. O hook de alteração de checking passa `nome` para um controller que filtra a coluna `cpf`.
11. Alguns updates usam apenas CPF/e-mail e podem modificar vários pedidos do mesmo participante.
12. Cadastro, cancelamento e resgate executam várias mutações sem transação; uma falha intermediária pode deixar dados parcialmente gravados.
13. `calculaData()` usa diferença absoluta e não rejeita eventos passados.
14. Não há suíte automatizada de testes nem scripts de lint, format ou test no `package.json`.
15. O carregamento de `.env` é repetido em quase todos os módulos, em vez de ocorrer apenas no bootstrap.
16. Há imports não utilizados de APIs internas do Supabase em alguns controllers.

### Prioridade recomendada

1. corrigir retornos HTTP e falhas de execução;
2. implementar autenticação/autorização e hash de senha;
3. tornar os fluxos compostos transacionais;
4. restringir updates por `id_pedido` e identidade autenticada;
5. adicionar validação de schema do payload;
6. criar testes unitários e de integração;
7. padronizar nomes de rotas e respostas em uma versão nova da API.

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
