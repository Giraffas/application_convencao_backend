import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function hookAutocompleteCnpj(req, res) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const  { cnpj } = req.body

        if (!cnpj) {
            res.status(400).json({
                erro: true,
                mensagem: 'informacao CNPJ vazia, nao e possivel executar o autocomplete'
            })
        }

        const client = await supabase()
        const{ data, error } = await client
        .schema(ambient)
        .from('EV_CADASTRO_CNPJ')
        .select("*")
        .eq('cnpj', cnpj)
        .maybeSingle()

        if(error) {
            console.error('Erro ao consultar cnpj  ', cnpj)
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar cnpj',
                msg_erro: error
            })
        }
        if(!data || data.length === 0) {
            res.status(400).json({
                erro: true,
                mensagem: 'CNPJ nao localizado na base, pro gentiliza seguir com o preenchimento'
            })
        }
        
        const response = data
        
        res.status(200).json({
            sucess: true,
            data: response
        })
    }
    catch(err) {
        console.error('Erro no hook de autocomplete  ', err)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro no hook de autocomplete',
            msg_erro: err
        })
    }
}