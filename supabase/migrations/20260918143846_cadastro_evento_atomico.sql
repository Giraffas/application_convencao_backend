-- ============================================================
-- 1. ADICIONA A NOVA COLUNA
-- ============================================================

ALTER TABLE "GIRAFFAS_PROD"."EV_CADASTRO_CLIENTES"
  ADD COLUMN IF NOT EXISTS categoria_participante text;


-- ============================================================
-- 2. ATUALIZA A FUNÇÃO DE CADASTRO
-- ============================================================

CREATE OR REPLACE FUNCTION "GIRAFFAS_PROD".cadastrar_evento(
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_cliente jsonb;
  v_acompanhante jsonb;
  v_crianca jsonb;
  v_parcela jsonb;
  v_transfer jsonb := p_payload -> 'transfer' -> 0;
  v_responsavel jsonb := p_payload -> 'clientes' -> 0;
  v_indice integer := 0;
  v_id_pedido text := p_payload ->> 'id_pedido';
BEGIN
  -- Impede que o mesmo código de pedido seja processado
  -- simultaneamente em transações diferentes.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_id_pedido, 0)
  );

  IF EXISTS (
    SELECT 1
      FROM "GIRAFFAS_PROD"."EV_PEDIDOS"
     WHERE id_pedido = v_id_pedido
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Código de pedido já utilizado';
  END IF;

  -- Evita que categoria_participante seja silenciosamente
  -- registrada como NULL.
  IF NULLIF(
    pg_catalog.btrim(
      v_responsavel ->> 'categoria_participante'
    ),
    ''
  ) IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'O campo clientes[0].categoria_participante é obrigatório';
  END IF;


  -- ==========================================================
  -- CNPJ / EMPRESA
  -- ==========================================================

  INSERT INTO "GIRAFFAS_PROD"."EV_CADASTRO_CNPJ" (
    created_at,
    cnpj,
    razao_social,
    cep,
    endereco,
    complemento,
    bairro,
    cidade,
    uf,
    cpf
  ) VALUES (
    current_date,
    p_payload ->> 'cnpj',
    p_payload ->> 'razao_social',
    p_payload ->> 'cep',
    p_payload ->> 'endereco',
    p_payload ->> 'complemento',
    p_payload ->> 'bairro',
    p_payload ->> 'cidade',
    p_payload ->> 'uf',
    v_responsavel ->> 'cpf'
  );


  -- ==========================================================
  -- CLIENTES
  -- ==========================================================

  FOR v_cliente IN
    SELECT value
      FROM pg_catalog.jsonb_array_elements(
        p_payload -> 'clientes'
      )
  LOOP
    insert into "GIRAFFAS_PROD"."EV_CADASTRO_CLIENTES" (
  created_at,
  data_inscricao,
  nome,
  nome_cracha,
  cpf,
  email,
  data_nascimento,
  tm_camiseta,
  tm_chinelo,
  enviou_convite,
  cnpj,
  telefone,
  tipo_cliente,
  presenca_cancelada,
  participa_auditorio,
  idade_evento,
  categoria,
  categoria_participante,
  valor_individual
) values (
  current_timestamp,
  nullif(p_payload ->> 'data_inscricao', '')::date,
  v_cliente ->> 'nome',
  v_cliente ->> 'nome_cracha',
  v_cliente ->> 'cpf',
  v_cliente ->> 'email',
  nullif(v_cliente ->> 'data_nascimento', '')::date,
  v_cliente ->> 'tm_camiseta',
  v_cliente ->> 'tm_chinelo',
  case
    when v_indice = 0
      then (p_payload ->> 'enviou_convite')::boolean
    else false
  end,
  p_payload ->> 'cnpj',
  v_cliente ->> 'telefone',
  case
    when v_indice = 0 then 'ANFITRIAO'
    else 'CONVIDADO'
  end,
  false,
  (v_cliente ->> 'participa_auditorio')::boolean,
  (v_cliente ->> 'idade_evento')::integer,
  v_cliente ->> 'categoria',
  nullif(
    pg_catalog.btrim(
      v_cliente ->> 'categoria_participante'
    ),
    ''
  ),
  (v_cliente ->> 'valor_individual')::numeric
);
    v_indice := v_indice + 1;
  END LOOP;


  -- ==========================================================
  -- ACOMPANHANTES
  -- ==========================================================

  FOR v_acompanhante IN
    SELECT value
      FROM pg_catalog.jsonb_array_elements(
        COALESCE(
          p_payload -> 'acompanhantes',
          '[]'::jsonb
        )
      )
  LOOP
    INSERT INTO "GIRAFFAS_PROD"."EV_ACOMPANHANTES" (
      id_pedido,
      nome_evento,
      nome,
      nome_cracha,
      cpf,
      email,
      data_nascimento,
      telefone,
      tm_camiseta,
      tm_chinelo,
      participa_auditorio,
      idade_evento,
      categoria,
      valor_individual,
      cpf_anfitriao,
      relacao_participante
    ) VALUES (
      v_id_pedido,
      p_payload ->> 'nome_evento',
      v_acompanhante ->> 'nome',
      v_acompanhante ->> 'nome_cracha',
      v_acompanhante ->> 'cpf',
      v_acompanhante ->> 'email',
      NULLIF(
        v_acompanhante ->> 'data_nascimento',
        ''
      )::date,
      v_acompanhante ->> 'telefone',
      v_acompanhante ->> 'tm_camiseta',
      v_acompanhante ->> 'tm_chinelo',
      (v_acompanhante ->> 'participa_auditorio')::boolean,
      (v_acompanhante ->> 'idade_evento')::integer,
      v_acompanhante ->> 'categoria',
      (v_acompanhante ->> 'valor_individual')::numeric,

      COALESCE(
        v_acompanhante ->> 'cpf_anfitriao',
        v_responsavel ->> 'cpf'
      ),

      v_acompanhante ->> 'relacao_participante'
    );
  END LOOP;


  -- ==========================================================
  -- CONVITE
  -- ==========================================================

  IF COALESCE(
    (p_payload ->> 'enviou_convite')::boolean,
    false
  ) THEN
    INSERT INTO "GIRAFFAS_PROD"."EV_REGISTRO_CONVITES" (
      created_at,
      nome_anfitriao,
      cpf_anfitriao,
      cnpj_anfitriao,
      email_anfitriao,
      nome_convidado,
      cpf_convidado,
      email_convidado,
      convite_resgatado
    ) VALUES (
      current_timestamp,
      v_responsavel ->> 'nome',
      v_responsavel ->> 'cpf',
      p_payload ->> 'cnpj',
      v_responsavel ->> 'email',
      p_payload ->> 'nome_convidado',
      p_payload ->> 'cpf_convidado',
      p_payload ->> 'email_convidado',
      false
    );
  END IF;


  -- ==========================================================
  -- CRIANÇAS
  -- ==========================================================

  FOR v_crianca IN
    SELECT value
      FROM pg_catalog.jsonb_array_elements(
        COALESCE(
          p_payload -> 'criancas',
          '[]'::jsonb
        )
      )
  LOOP
    INSERT INTO "GIRAFFAS_PROD"."EV_CADASTRO_CRIANCA" (
      created_at,
      nome_responsavel,
      cpf_responsavel,
      email_responsavel,
      telefone_responsavel,
      cpf_crianca,
      nome_crianca,
      data_nascimento,
      email,
      tm_camiseta,
      tm_chinelo,
      idade_evento,
      categoria,
      valor_individual
    ) VALUES (
      current_date,
      v_crianca ->> 'nome_responsavel',
      v_crianca ->> 'cpf_responsavel',
      v_crianca ->> 'email_responsavel',
      v_crianca ->> 'telefone_responsavel',
      NULLIF(v_crianca ->> 'cpf_crianca', ''),
      v_crianca ->> 'nome_crianca',
      NULLIF(
        v_crianca ->> 'data_nascimento',
        ''
      )::date,
      v_crianca ->> 'email',
      v_crianca ->> 'tm_camiseta',
      v_crianca ->> 'tm_chinelo',
      (v_crianca ->> 'idade_evento')::integer,
      v_crianca ->> 'categoria',
      (v_crianca ->> 'valor_individual')::numeric
    );
  END LOOP;


  -- ==========================================================
  -- PEDIDO
  -- ==========================================================

  INSERT INTO "GIRAFFAS_PROD"."EV_PEDIDOS" (
    created_at,
    nome,
    email,
    cpf,
    cnpj,
    tipo_quarto,
    tipo_cama,
    preferencia_cama,
    divisao_pagamento,
    quantidade_parcelas,
    valor_total,
    data_embarque,
    regiao_embarque,
    horario_embarque,
    data_desembarque,
    regiao_desembarque,
    horario_desembarque,
    id_pedido,
    pedido_ativo
  ) VALUES (
    current_date,
    v_responsavel ->> 'nome',
    v_responsavel ->> 'email',
    v_responsavel ->> 'cpf',
    p_payload ->> 'cnpj',
    p_payload ->> 'tipo_quarto',
    p_payload ->> 'tipo_cama',
    p_payload ->> 'preferencia_cama',
    (p_payload ->> 'divisao_pagamento')::boolean,
    (p_payload ->> 'quantidade_parcelas')::integer,
    (p_payload ->> 'valor_total')::numeric,
    NULLIF(v_transfer ->> 'data_embarque', '')::date,
    v_transfer ->> 'regiao_embarque',
    v_transfer ->> 'horario_embarque',
    NULLIF(v_transfer ->> 'data_desembarque', '')::date,
    v_transfer ->> 'regiao_desembarque',
    v_transfer ->> 'horario_desembarque',
    v_id_pedido,
    true
  );


  -- ==========================================================
  -- PARCELAS
  -- ==========================================================

  FOR v_parcela IN
    SELECT value
      FROM pg_catalog.jsonb_array_elements(
        COALESCE(
          p_payload -> 'parcelas',
          '[]'::jsonb
        )
      )
  LOOP
    INSERT INTO "GIRAFFAS_PROD"."EV_PARCELAS_PGTO" (
      cpf,
      numero_parcela,
      valor_parcela,
      parcela_paga,
      created_at,
      parcela_valida,
      id_pedido
    ) VALUES (
      v_parcela ->> 'cpf',
      (v_parcela ->> 'numero_parcela')::smallint,
      (v_parcela ->> 'valor_parcela')::numeric,
      false,
      current_date,
      (v_parcela ->> 'parcela_valida')::boolean,
      v_id_pedido
    );
  END LOOP;

  RETURN pg_catalog.jsonb_build_object(
    'id_pedido',
    v_id_pedido
  );
END;
$function$;


-- ============================================================
-- 3. PERMISSÕES DA RPC
-- ============================================================

REVOKE EXECUTE
ON FUNCTION "GIRAFFAS_PROD".cadastrar_evento(jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION "GIRAFFAS_PROD".cadastrar_evento(jsonb)
TO service_role;


-- ============================================================
-- 4. ATUALIZA A VIEW ADMINISTRATIVA
--
-- As colunas novas foram adicionadas no final para preservar
-- a sequência das colunas que já existiam na view.
-- ============================================================

CREATE OR REPLACE VIEW "GIRAFFAS_PROD"."vw_ev_clientes"
WITH (security_invoker = true)
AS
SELECT
  a.data_inscricao,
  b.pedido_ativo,
  b.id_pedido AS protocolo,
  a.nome,
  a.nome_cracha,
  a.cpf,
  a.email,
  a.data_nascimento,
  a.tm_camiseta,
  a.tm_chinelo,
  ev_crianca.nome_crianca,
  ev_crianca.cpf_crianca,
  a.enviou_convite,
  ev_acompanhante.cpf AS cpf_acompanhante,
  ev_acompanhante.data_nascimento
    AS data_nascimento_acompanhante,
  ev_acompanhante.email
    AS email_acompanhante,
  ev_acompanhante.cpf_anfitriao,
  ev_acompanhante.nome
    AS nome_acompanhante,
  a.cnpj,
  a.telefone,
  a.tipo_cliente,
  a.presenca_cancelada,
  a.participa_auditorio,
  a.idade_evento,
  a.categoria,
  a.valor_individual,
  b.tipo_quarto,
  b.preferencia_cama,
  b.divisao_pagamento,
  b.quantidade_parcelas,
  b.regiao_embarque,
  b.horario_embarque,
  b.regiao_desembarque,
  b.horario_desembarque,

  CASE
    WHEN b.divisao_pagamento IS NOT TRUE
      THEN 'Sem divisao de pagamento'::text
    ELSE COALESCE(
      divisao.nomes,
      'Nenhum outro participante encontrado'::text
    )
  END AS nome_divisao,

  a.categoria_participante,
  ev_acompanhante.relacao_participante

FROM "GIRAFFAS_PROD"."EV_PEDIDOS" b

JOIN "GIRAFFAS_PROD"."EV_CADASTRO_CLIENTES" a
  ON a.cpf = b.cpf

LEFT JOIN LATERAL (
  SELECT
    pg_catalog.string_agg(
      DISTINCT cliente_divisao.nome,
      ', '
      ORDER BY cliente_divisao.nome
    ) AS nomes
  FROM "GIRAFFAS_PROD"."EV_PARCELAS_PGTO" parcela

  JOIN "GIRAFFAS_PROD"."EV_CADASTRO_CLIENTES"
    cliente_divisao
    ON cliente_divisao.cpf = parcela.cpf

  WHERE parcela.id_pedido = b.id_pedido
    AND parcela.cpf <> b.cpf
) divisao ON true

LEFT JOIN "GIRAFFAS_PROD"."EV_CADASTRO_CRIANCA"
  ev_crianca
  ON a.cpf = ev_crianca.cpf_responsavel

LEFT JOIN "GIRAFFAS_PROD"."EV_ACOMPANHANTES"
  ev_acompanhante
  ON a.cpf = ev_acompanhante.cpf_anfitriao

ORDER BY b.id_pedido;


REVOKE ALL
ON "GIRAFFAS_PROD"."vw_ev_clientes"
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON "GIRAFFAS_PROD"."vw_ev_clientes"
TO service_role;


-- ============================================================
-- 5. ATUALIZA O CACHE DO POSTGREST
-- ============================================================

NOTIFY pgrst, 'reload schema';