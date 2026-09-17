import { GoTrueAdminApi, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";


export default async function postReactiveInscricaoRoute(req, res) {
    
    try{
        const {cpf, email} = req.body
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        const client = await supabase() 

        const {data, error} = await client
            .schema(ambient)
            .from('EV_CADASTRO_CLIENTES')
            .update({"presenca_cancelada": false})
            .eq('cpf',cpf)
            .eq('email', email)
            .select('*')

        if(error) {
            console.error('Erro ao cancelar reserva  ', error)
            return res.status(400).json({
                erro: true,
                mensagem: 'Erro ao cancelar reserva',
                msg_erro: error
            })
        }
        if(!data || data.length == 0) {
            console.error('Erro ao cancelar reserva, cliente nao encontrado')
             return res.status(400).json({
                erro: true,
                mensagem: 'Erro ao cancelar reserva, cliente nao encontrado',
            })
        }
        return res.status(200).json({
            sucess: true,
            mensagem: 'Cliente reativado com sucesso'
        })
    }
    catch(error) {
        console.error('Erro interno ao cancelar inscricao: ', error)
        return 'status500'
    }
  

}