import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import geraDataHoje from "../functions/geraDataHoje.js";
import { config } from "dotenv";

export default async function postInsertCrianca(nome_responsavel,cpf_responsavel, email_responsavel, telefone_responsavel, cpf_crianca, nome_crianca, data_nascimento) {
    try {
        
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const hoje = geraDataHoje()


        const client = await supabase()
        const {error} = await client
            .schema(ambient)
            .from("EV_CADASTRO_CRIANCA")
            .insert({
                "created_at": hoje,
                "nome_responsavel": nome_responsavel,
                "cpf_responsavel": cpf_responsavel,
                "email_responsavel": email_responsavel,
                "telefone_responsavel": telefone_responsavel,
                "cpf_crianca": cpf_crianca,
                "nome_crianca": nome_crianca,
                "data_nascimento": data_nascimento
            }) 

        if(error){
            console.error('Erro ao inserir cadastro de crianca  ', error)
            return 'status400'
        }
        
    }   
    catch(error) {
        console.log('Erro ao inserir cadastro de crianca  ', error)
        return 'status500'
    }
}