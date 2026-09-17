import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postAlteracaoChecking(cpf, email, nova_data) {
    try {
        
        const drienv = pathAbsolute('.env')
        config({path: drienv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PEDIDOS')
            .update({data_embarque: nova_data})
            .eq('cpf', cpf)
            .eq('email', email)
            .select('*')

        
        if(error) {
            console.error('Erro ao alterar data de checking  ', error)
            return 'status400'
        }

        if(!data || data.length == 0) {
            console.error('Erro ao alterar data de checking: cliente nao encontrado')
            return 'status400'
        }

        return true
    }
    catch(erro) {
         console.error('Erro ao atualizar nova data de checking, ERRO INTERNO NO SERVIDOR')
         return false
    }
}