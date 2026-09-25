CREATE OR REPLACE FUNCTION "GIRAFFAS_PROD".cadastrar_evento(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_cliente jsonb;
  v_acompanhante jsonb;
  v_crianca jsonb;
  v_parcela jsonb;
  v_transfer jsonb := p_payload -> 'transfer' -> 0;
  v_responsavel jsonb := p_payload -> 'clientes' -> 0;
  v_indice integer := 0;
  v_id_pedido text := p_payload ->> 'id_pedido';
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_id_pedido, 0)
  );

  if exists (
    select 1
      from "GIRAFFAS_PROD"."EV_PEDIDOS"
     where id_pedido = v_id_pedido
  ) then
    raise exception using
      errcode = '23505',
      message = 'Código de pedido já utilizado';
  end if;

  insert into "GIRAFFAS_PROD"."EV_CADASTRO_CNPJ" (
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
  ) values (
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

  for v_cliente in
    select value
      from jsonb_array_elements(p_payload -> 'clientes')
  loop
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
      valor_individual
    ) values (
      current_timestamp,
      p_payload ->> 'data_inscricao',
      v_cliente ->> 'nome',
      v_cliente ->> 'nome_cracha',
      v_cliente ->> 'cpf',
      v_cliente ->> 'email',
      v_cliente ->> 'data_nascimento',
      v_cliente ->> 'tm_camiseta',
      v_cliente ->> 'tm_chinelo',
      case when v_indice = 0 then (p_payload ->> 'enviou_convite')::boolean else false end,
      p_payload ->> 'cnpj',
      v_cliente ->> 'telefone',
      case when v_indice = 0 then 'ANFITRIAO' else 'CONVIDADO' end,
      false,
      (v_cliente ->> 'participa_auditorio')::boolean,
      (v_cliente ->> 'idade_evento')::integer,
      v_cliente ->> 'categoria',
      (v_cliente ->> 'valor_individual')::numeric
    );
    v_indice := v_indice + 1;
  end loop;

  for v_acompanhante in
    select value
      from jsonb_array_elements(coalesce(p_payload -> 'acompanhantes', '[]'::jsonb))
  loop
    insert into "GIRAFFAS_PROD"."EV_ACOMPANHANTES" (
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
      cpf_anfitriao
    ) values (
      v_id_pedido,
      p_payload ->> 'nome_evento',
      v_acompanhante ->> 'nome',
      v_acompanhante ->> 'nome_cracha',
      v_acompanhante ->> 'cpf',
      v_acompanhante ->> 'email',
      nullif(v_acompanhante ->> 'data_nascimento', '')::date,
      v_acompanhante ->> 'telefone',
      v_acompanhante ->> 'tm_camiseta',
      v_acompanhante ->> 'tm_chinelo',
      (v_acompanhante ->> 'participa_auditorio')::boolean,
      (v_acompanhante ->> 'idade_evento')::integer,
      v_acompanhante ->> 'categoria',
      (v_acompanhante ->> 'valor_individual')::numeric,
      coalesce(v_acompanhante ->> 'cpf_anfitriao', v_responsavel ->> 'cpf')
    );
  end loop;

  if (p_payload ->> 'enviou_convite')::boolean then
    insert into "GIRAFFAS_PROD"."EV_REGISTRO_CONVITES" (
      created_at,
      nome_anfitriao,
      cpf_anfitriao,
      cnpj_anfitriao,
      email_anfitriao,
      nome_convidado,
      cpf_convidado,
      email_convidado,
      convite_resgatado
    ) values (
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
  end if;

  for v_crianca in
    select value
      from jsonb_array_elements(coalesce(p_payload -> 'criancas', '[]'::jsonb))
  loop
    insert into "GIRAFFAS_PROD"."EV_CADASTRO_CRIANCA" (
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
    ) values (
      current_date,
      v_crianca ->> 'nome_responsavel',
      v_crianca ->> 'cpf_responsavel',
      v_crianca ->> 'email_responsavel',
      v_crianca ->> 'telefone_responsavel',
      v_crianca ->> 'cpf_crianca',
      v_crianca ->> 'nome_crianca',
      nullif(v_crianca ->> 'data_nascimento', '')::date,
      v_crianca ->> 'email',
      v_crianca ->> 'tm_camiseta',
      v_crianca ->> 'tm_chinelo',
      (v_crianca ->> 'idade_evento')::integer,
      v_crianca ->> 'categoria',
      (v_crianca ->> 'valor_individual')::numeric
    );
  end loop;

  insert into "GIRAFFAS_PROD"."EV_PEDIDOS" (
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
  ) values (
    current_date,
    v_responsavel ->> 'nome',
    v_responsavel ->> 'email',
    v_responsavel ->> 'cpf',
    p_payload ->> 'cnpj',
    p_payload ->> 'tipo_quarto',
    p_payload ->> 'tipo_cama',
    p_payload ->> 'preferencia_cama',
    (p_payload ->> 'divisao_pagamento')::boolean,
    p_payload ->> 'quantidade_parcelas',
    (p_payload ->> 'valor_total')::numeric,
    nullif(v_transfer ->> 'data_embarque', '')::date,
    v_transfer ->> 'regiao_embarque',
    v_transfer ->> 'horario_embarque',
    nullif(v_transfer ->> 'data_desembarque', '')::date,
    v_transfer ->> 'regiao_desembarque',
    v_transfer ->> 'horario_desembarque',
    v_id_pedido,
    true
  );

  for v_parcela in
    select value
      from jsonb_array_elements(p_payload -> 'parcelas')
  loop
    insert into "GIRAFFAS_PROD"."EV_PARCELAS_PGTO" (
      cpf,
      numero_parcela,
      valor_parcela,
      parcela_paga,
      created_at,
      parcela_valida,
      id_pedido
    ) values (
      v_parcela ->> 'cpf',
      (v_parcela ->> 'numero_parcela')::smallint,
      (v_parcela ->> 'valor_parcela')::numeric,
      false,
      current_date,
      (v_parcela ->> 'parcela_valida')::boolean,
      v_id_pedido
    );
  end loop;

  return jsonb_build_object('id_pedido', v_id_pedido);
end;
$function$;
