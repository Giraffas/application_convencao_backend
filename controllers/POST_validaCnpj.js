import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";
import supabase from "../database/supabase.js";

export default async function postValidaCnpj(req, res) {
    try {
        
        const {cnpj} = req.body
        console.log(cnpj)
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const client = await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('EV_BASE_CNPJ_ATIVA')
            .select('*')
            .eq('cnpj', cnpj)

        if(error) {
           return  res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar cadastro do cnpj',
                msg_erro: error
            })
        }
        if(!data || data.length == 0) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Cadastro do CNPJ não localizado, não sera possivel seguir com a inscrição para o evento, em caso de duvidas entrar em contato com o email eventos@giraffas.com'
            })
        }
        res.status(200).json({
            sucess: true,
            mensagem: 'Cnpj ativo na base',
            data: data
        })
    }
    catch (error) {
        console.error('Erro na rota de validacao de cnpj  ', error)
        return res.status(500).json({
            erro: true,
            mensagem: 'Erro na rota de validacao de cnpj',
            msg_erro: error
        })
    }
}