import supabase from '../database/supabase.js'
import pathAbsolute from '../functions/pathAbsolute.js'
import { config } from 'dotenv'

export default async function postAlteraCnpj(cpf, cnpj) {
    try{
        const direvn = pathAbsolute('.env')
        config({path: direvn})
        const ambient = process.env.AMBIENT

        const client = await supabase()
        
        const {data, error} = await client
            .schema(ambient)
            .from('EV_CADASTRO_CLIENTES')
            .update({
                "cnpj": cnpj
            })
            .eq("cpf", cpf)
            .select('*')

        if(error) {
            console.error('Erro ao modificar cnpj  ', error)
            return 'status400'
        }
        if(!data || data.length == 0) {
            console.error('Erro  ao modificar cnpj, cliente nao encontrado')
            return 'status400'
        }
        return true
    }
    catch(error) {
        console.error('Erro ao gerar modificacao no cnpj')
        return 'status500'
    }
}