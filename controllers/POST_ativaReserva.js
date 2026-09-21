import { GoTrueAdminApi, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";


export default async function postAtivaReserva(documenty, email) {
    
    try{

        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const client = await supabase() 

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PEDIDOS')
            .update({pedido_ativo: true})
            .eq('cpf',documenty)
            .eq('email', email)
            .select('*')

        if(error) {
            console.error('Erro ao ativar reserva  ', error)
            return 'status400'
        }
        if(!data || data.length == 0) {
            console.error('Erro ao ativar reserva, cliente nao encontrado')
            return 'status400'
        }
        return true
    }
    catch(error) {
        console.error('Erro interno ao ativar reserva: ', error)
        return 'status500'
    }
  

}