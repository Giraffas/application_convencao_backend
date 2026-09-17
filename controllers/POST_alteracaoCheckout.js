import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postAlteracaoCheckout(cpf, email, data_checkout) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PEDIDOS')
            .update({data_saida: data_checkout})
            .eq('cpf', cpf)
            .eq('email', email)
            .select()
            .maybeSingle()
        
        if(error) {
            console.error('Erro ao alterar data de saida:  ', error)
            return 'status400'
        }
        
        if(!data || data.length == 0) {
            console.error('Erro ao alterar data de saida: cliente nao encontrado')
            return 'status400'
        }
        return true

    }
    catch(error) {
        console.error('Erro ao realizar alteracao do checkout  ', error)
        return false
    }
}