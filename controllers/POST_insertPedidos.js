import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import geraDataHoje from "../functions/geraDataHoje.js";
import { config } from "dotenv";

export default async function postInsertPedidos(nome,email,cpf,cnpj,tipo_quarto,divisao_pagamento, quantidade_parcelas, data_embarque, regiao_embarque,horario_embarque,id_pedido) {
    try {
        
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const hoje = geraDataHoje()

        const client = await supabase()

        const {error} = await client
            .schema(ambient)
            .from('EV_PEDIDOS')
            .insert({
            "created_at": hoje,
            "nome": nome,
            "email": email,
            "cpf": cpf,
            "cnpj": cnpj,
            "tipo_quarto": tipo_quarto,
            "divisao_pagamento": divisao_pagamento,
            "quantidade_parcelas": quantidade_parcelas,
            "data_embarque": data_embarque,
            "regiao_embarque":regiao_embarque,
            "horario_embarque": horario_embarque,
            "id_pedido": id_pedido,
            "pedido_ativo": true
            })

        if(error) {
          console.log('Erro ao gerar pedido ', error)
          return 'status400'
        }
        return true

    }
    catch(error) {
        console.error('Erro ao inserir reserva (pedido),  ' , error)
       return 'status500'
    }
}
