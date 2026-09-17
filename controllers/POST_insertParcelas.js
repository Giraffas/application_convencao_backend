import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";
import geraDataHoje from '../functions/geraDataHoje.js'

export default async function postInsertParcelas(cpf, numero_parcela, valor_parcela,parcela_valida, id_pedido) {
    try {
            const direnv = pathAbsolute('.env')
            config({path: direnv})
            const ambient = process.env.AMBIENT
            const hoje = geraDataHoje()

            const client = await supabase()

            if(!id_pedido) {
                console.error('nao e possivel criar um pedido sem id pedido')
                return 'status500'
            }
            console.log(id_pedido)
            const {error} = await client
                .schema(ambient)
                .from("EV_PARCELAS_PGTO")
                .insert({
                    "cpf": cpf,
                    "numero_parcela": numero_parcela,
                    "valor_parcela": valor_parcela,
                    "parcela_paga": false,
                    "parcela_valida":parcela_valida,
                    "id_pedido": id_pedido,
                    "created_at": hoje
                })

            if(error) {
                console.error('Erro ao registrar parcelas do pedido  ', error)
                return 'status400'
            }
            return true
    }
    catch(error) {
        console.error('Erro ao inserir parcelas:  ', error)
        return 'status500'
    }




}