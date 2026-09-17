import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function getConsultaPedido(codigo_pedido) {
        try {
            
            const direnv = pathAbsolute('.env')
            config({path: direnv})
            const ambient = process.env.AMBIENT

            const client = await supabase()

            const {data, error} = await client  
                .schema(ambient)
                .from("EV_PEDIDOS")
                .select("*")
                .eq('id_pedido', codigo_pedido)
                .limit(1)
            if(error) {
                console.error('Erro ao consultar informacao de pedidos existentes ', error)
                return 'status400'
            }
            
            if(data.length != 0) {
                console.log('Condicao diferente de zero')
                return false
            }
            if(data.length == 0 ){
                return true
            }
        }   
        catch(error) {
            console.log('Erro ao consultar codigo do pedido na base  ', error)    
            return 'status500'

        }
}