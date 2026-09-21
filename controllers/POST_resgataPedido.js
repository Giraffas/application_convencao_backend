import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";


export default async function postResgataPedido(req, res) {
    try {
        const {
            cpf
        } = req.body
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT


        const client= await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PEDIDOS')
            .select('*')
            .eq('cpf', cpf)

        if(error) {
            res.status(400).json({
                erro:true,
                mensagem: 'Erro ao carregar pedido'
            })
        }

        if(!data || data.length == 0) {
            res.status(400).json({
                erro:true,
                mensagem: 'Pedido nao encontrado para o cliente'
            })
        }
        res.status(200).json({
            sucess: true,
            mensagem: 'pedido consultado com sucesso',
            data: data
        })
    }
    
    catch(error) {
        console.error('Erro interno no servidor ao resgatar pedido  ', error)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno no servidor ao resgatar pedido',
            msg_erro: error
        })
    }
    
}