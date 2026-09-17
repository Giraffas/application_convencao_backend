import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postConfirmaParcela(cpf) {
    try{
        
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PARCELAS_PGTO')
            .update({
               "parcela_valida": true 
            })
            .eq('cpf', cpf)
            .select('*')

        if(error) {
            console.log('Erro ao confirmar parcela  ', error)
            return 'status400'
        }
        if(!data || data.length == 0) {
            console.error('Erro ao confirmar parcela, PARCELAS NAO ENCONTRADAS')
            return 'status400'
        }

        return true
    }
    catch(error) {
        console.log('Erro ao confirmar parcela  ', error)
        return 'status500'
    }
}