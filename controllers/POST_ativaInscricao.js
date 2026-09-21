import { GoTrueAdminApi, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";


export default async function postAtivaInscricao(cpf, email) {
    
    try{
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const client = await supabase() 

        const {data, error} = await client
            .schema(ambient)
            .from('EV_CADASTRO_CLIENTES')
            .update({"presenca_cancelada": false})
            .eq('cpf',cpf)
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