import geraToken from "../functions/geraToken.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";
import supabase from "../database/supabase.js";
export default async function login(req, res) {
    try {    

        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT

        const {email, senha} = await req.body
        
        const filtro = Object.fromEntries(
            Object.entries({
                email,
                senha
            }).filter(([,valor]) => {
                return(
                    valor !== undefined &&
                    valor !== null &&
                    valor !== ''
                )
            })
        )

        if(Object.keys(filtro).length === 0) {
            res.status(400).json({
                erro: true,
                mensagem: 'Digite os dados de login para acessar como administrador'
            })
        }

        const client = await supabase()
        const {data, error} = await  client
        .schema(ambient)
        .from('EV_USUARIOS_ADMINISTRATIVOS')
        .select('*')
        .match(filtro)
        .limit(1)

        if(error) {
            console.error('Erro ao consultar login na base de dados  ', error )
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar login na base de dados',
                msg_erro: error
            })

        }
        if (!data || data.length === 0) {
            return res.status(401).json({
                erro: true,
                mensagem: "Usuário ou senha inválidos"
            });
        }
        const token = geraToken(data.email, data.email, res)
        res.status(200).json({
            sucess: true,
            mensagem: 'login realizado com sucesso',
            token: token
        })
    }   
    catch(err) {
        console.error('Erro na geracao de login  ', err)
        res.status(500).json({
            erro: true,
            mensagem: err
        })
    } 
}