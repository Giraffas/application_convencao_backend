import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function getRouterDataEvento(req, res) {
    try {

        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const client = await supabase()

        const { data, error } = await client
        .schema(ambient)
        .from('EV_DATA_EVENTO')
        .select('data_evento')

        if(error) {
            console.error('Erro ao consultar data do evendo  ', error)
            return res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar data do evento',
                msg_erro: error
            })
        }

        if(!data || data.length == 0 ) {
            return res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar data do evento, Nenhum evento encontrado'
            })
        }
        return res.status(200).json({
            sucess: true,
            data: data
        })
    }
    catch (error){
        console.error('Erro ao consultar data do evento  ', error)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro ao consultar a data do evento no servidor, ERRO INTERNO NO SERVIDOR'
        })
    }
}