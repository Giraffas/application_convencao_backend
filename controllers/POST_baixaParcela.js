import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default  async function postBaixaParcela(req, res) {
    try {
        
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        
        const {cpf, numero_parcela} = req.body 

        const client = await supabase()

        const {data, error} = await client
            .schema(ambient)
            .from('EV_PARCELAS_PGTO')
            .update({parcela_paga: true})
            .eq("cpf", cpf)
            .eq('numero_parcela', numero_parcela)
            .select('*')

        if(error) {
            console.error('Erro ao baixar parcela ', error)
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao baixar parcela',
                msg_erro: error
            })
        }
        
        if(!data || data.length == 0) {
            console.error('Erro ao baixar parcela, PARCELA DO CLIENTE NAO ENCONTRADA')
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao baixar parcela, PARCELA DO CLIENTE NAO ENCONTRADA'
            })
        }

        res.status(200).json({
            sucess: true,
            mensagem: 'Parcela baixada com sucesso'
        })
    }       
    catch(error) {
        console.error('Erro ao realizar baixa da parcela  ', error)
        res.status(500).json({
            erro:true,
            mensagem: 'Erro ao realizar baixa da parcela',
            msg_erro: error
        })
    }
}