import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function  getClientesAtivos(req, res) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        
        const client = await supabase()
        const {data, error} = await client
            .schema(ambient)
            .from('EV_CADASTRO_CLIENTES')
            .select('*')
            .eq('presenca_cancelada', false)

        if(error) {
            return res.status(400).json({
                erro:true,
                mensagem: 'Erro ao consultar cadastro de clientes ativos',
                msg_erro: error
            })
        }
        if(!data || data.length == 0) {
            return res.status(400).json({
                erro:true,
                mensagem: 'Erro ao consultar cadastro de clientes ativos, nenhum usuario nesse estado foi encontrado'
            })
        }
        
    }
    catch(error) {
        res.status(500).json({
            erro: true,
            mensagem: 'Erro ao consultar clientes, Erro interno no servidor'
        })
    }
}