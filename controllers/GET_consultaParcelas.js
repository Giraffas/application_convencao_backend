import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function getConsultaParcelas(req, res) {
    try {
        
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('vw_ev_analise_financeira')
            .select("*")
        
            if(error) {
            console.error('Erro ao consultar informacao das parcelas', error)
            return res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar informacao das parcelas',
                msg_erro: error
            })}

            if(!data || data.length == 0) {
            return res.status(400).json({
                erro:true,
                mensagem: 'Erro ao consultar parcelas, Nenhuma parcela foi encontrada'
            })
        }
        res.status(200).json({
            sucess: true,
            data: data
        })
    }
    catch(error) {
        console.error('Erro ao consultar parcelas ', error)
        return res.status(500).json({
            erro: true,
            mensagem: 'Erro ao consultar parcelas',
            msg_erro: error
        })
    }
}