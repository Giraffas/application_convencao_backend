import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function getDataEvento(evento) {
    try {
        if(!evento) {
            console.error('atritubo da rota esta vazio')
            return false
        }
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const { data, error } = await client
        .schema(ambient)
        .from('EV_DATA_EVENTO')
        .select('data_evento')
        .eq('nome_evento', evento)
        .eq('ativo', true)
        .maybeSingle()

        if(error) {
            console.error('Erro ao consultar data do evendo  ', error)
            return false
        }

        if(!data || data.length == 0 ) {
            console.error('Evento nao encontrado  ', error)
            
            return false
        }
        
        const response = await data
        return response
    }
    catch {

    }
}