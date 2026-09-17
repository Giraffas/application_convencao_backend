import supabase from '../database/supabase.js'
import pathAbsolute from '../functions/pathAbsolute.js'
import geraDataHoje from '../functions/geraDataHoje.js'
import { config } from 'dotenv'

export default async function postInsertClientes(nome,nome_cracha,cpf,email,data_nascimento,tm_camiseta,tm_chinelo,enviou_convite,cnpj,telefone,tipo_cliente) {
    try {
        
        const hoje = geraDataHoje()
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()
        
        const {error} = await client
            .schema(ambient)
            .from('EV_CADASTRO_CLIENTES')
            .insert({
                    "created_at": hoje,
                    "nome":nome,
                    "nome_cracha": nome_cracha,
                    "cpf": cpf,
                    "email": email,
                    "data_nascimento": data_nascimento,
                    "tm_camiseta": tm_camiseta,
                    "tm_chinelo": tm_chinelo,
                    "enviou_convite": enviou_convite,
                    "cnpj": cnpj,
                    "telefone": telefone,
                    "tipo_cliente": tipo_cliente,
                    "presenca_cancelada": false
            })

        if(error) {
            console.error('Erro ao cadastrar cliente  ', error)
           return 'status400'

        }
        return true

    }
    catch(error) {
        console.error('Erro ao inserir clientes  ' , error)
        return 'status500'
    }
}