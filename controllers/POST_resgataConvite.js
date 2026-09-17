import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postResgataConvite (email_convidado,email_anfitriao) {
    try {

        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()
        const {data, error} = await client
            .schema(ambient)
            .from('EV_REGISTRO_CONVITES')
            .update({convite_resgatado: true})
            .eq('email_convidado', email_convidado)
            .eq('email_anfitriao', email_anfitriao)
            .select('*')

        if(error) {
            console.error('Erro ao resgatar convite  ', error)
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao resgatar convite',
                msg_erro: error
            })
        }
        if(!data || data.length == 0) {
            console.error('Erro ao resgatar convite, cliente nao encontrado')
            return 'status400'
        }
        return true
    }
    catch(error) {
        console.error('Erro ao resgatar convite ', error)
        return 'status500'
    }
}