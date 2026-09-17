import { GoTrueAdminApi, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";


export default async function postCancelaInscricao(documenty, email) {
    
    try{

        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const client = await supabase() 

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PEDIDOS')
            .update({pedido_ativo: false})
            .eq('cpf',documenty)
            .eq('email', email)
            .select('*')

        if(error) {
            console.error('Erro ao cancelar reserva  ', error)
            return 'status400'
        }
        if(!data || data.length == 0) {
            console.error('Erro ao cancelar reserva, cliente nao encontrado')
            return 'status400'
        }
        return true
    }
    catch(error) {
        console.error('Erro interno ao cancelar inscricao: ', error)
        return 'status500'
    }
  

}