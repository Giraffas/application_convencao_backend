import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function  getClientes(req, res) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        
        const client = await supabase()
        const {data, error} = await client
            .schema(ambient)
            .from('vw_ev_clientes')
            .select('*')
        if(error) {
            return res.status(400).json({
                erro:true,
                mensagem: 'Erro ao consultar cadastro de clientes ',
                msg_erro: error
            })
        }
        if(!data || data.length == 0) {
            return res.status(400).json({
                erro:true,
                mensagem: 'Erro ao consultar cadastro de clientes , nenhum usuario nesse estado foi encontrado'
            })
        }
        res.status(200).json({
            sucess: true,
            data: data
        })
        
    }
    catch(error) {
        res.status(500).json({
            erro: true,
            mensagem: 'Erro ao consultar clientes, Erro interno no servidor'
        })
    }
}2