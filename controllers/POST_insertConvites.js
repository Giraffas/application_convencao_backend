import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import geraDataHoje from "../functions/geraDataHoje.js";
import { config } from "dotenv";

export default async function postInsertConvites(nome_anfitriao,cpf_anfitriao,cnpj_anfitriao,email_anfitriao,nome_convidado,cpf_convidado,email_convidado,) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const hoje = geraDataHoje()

        const client = await supabase()

        const {error} = await client
            .schema(ambient)
            .from('EV_REGISTRO_CONVITES')
            .insert({
                    created_at: hoje,
                    nome_anfitriao: nome_anfitriao,
                    cpf_anfitriao: cpf_anfitriao,
                    cnpj_anfitriao: cnpj_anfitriao,
                    email_anfitriao: email_anfitriao,
                    nome_convidado: nome_convidado,
                    cpf_convidado: cpf_convidado,
                    email_convidado: email_convidado,
                    convite_resgatado: false
            })

        if(error) {
            console.error('Erro ao inserir convite  ', error)
            return 'status400'
        }
        return true
        
    }
    catch(error) {
        console.error('Erro no cadastro de convites  ',  error)
        return 'status500'
    }
}