import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";
import geraDataHoje from '../functions/geraDataHoje.js'

export default  async function postInsertEmpresa(razao_social,cnpj,cep,endereco, complemento,bairro, cidade,uf, cpf) {
    try {
        const hoje = geraDataHoje()
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const {error} = await client
            .schema(ambient)
            .from("EV_CADASTRO_CNPJ")
            .insert({
             created_at: hoje,
             cnpj: cnpj,
             razao_social: razao_social,
             cep: cep,
             endereco: endereco,
             complemento: complemento,
             bairro: bairro,
             cidade: cidade,
             uf: uf,
             cpf: cpf
            })

        if(error) {
          return 'status400'
        }
        return true

    }
    catch(error) {
        console.error('Erro ao inserir dados da loja:  ', error)
        return 'status500' 
    }
}