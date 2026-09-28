import { GoTrueAdminApi } from "@supabase/supabase-js";
import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function  getBaseCnpj(req, res) {
    try {

        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const {data, error} = await client
        .schema(ambient)
        .from('EV_BASE_CNPJ_ATIVA')
        .select('*')

        if(error) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar CNPJs disponiveis',
                msg_erro: error
            })
        }
        if (!data || data.length == 0) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Nenhum CNPJ encontrado na base'
            })
        }
        
        return res.status(200).json({
            sucess: true,
            mensagem: 'Consulta realizada com sucesso',
            data: data
        })
       
    }
    catch(error) {
        console.error('Erro ao consultar CNPJs  ', error)
        return res.status(500).json({
            erro:true,
            mensagem: 'Erro ao consultar CNPJs',
            msg_erro: error
        })
    }
}