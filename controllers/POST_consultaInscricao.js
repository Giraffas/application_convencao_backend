import supabase from "../database/supabase.js";
import geraToken from "../functions/geraToken.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import { config } from "dotenv";

export default async function postConsultaInscricao(req, res) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})        
        const ambient = process.env.AMBIENT

        const {
            cpf,
            cnpj,
            nome,
            telefone,
            email
        } = req.body
         
        
        if(!cpf) {
            res.status(400).json({
                erro: true,
                mensagem: 'Campo CPF vazio, por gentileza preencher campo'
            })
        }
        if(!cnpj) {
            res.status(400).json({
                erro: true,
                mensagem: 'Campo CNPJ vazio, por gentileza preencher campo'
            })
        }
        if(!nome) {
            res.status(400).json({
                erro: true,
                mensagem: 'Campo NOME vazio, por gentileza preencher campo'
            })
        }
        if(!telefone) {
            res.status(400).json({
                erro: true,
                mensagem: 'Campo TELEFONE vazio, por gentileza preencher campo'
            })
        }
        if(!email) {
            res.status(400).json({
                erro: true,
                mensagem: 'Campo EMAIL vazio, por gentileza preencher campo'
            })
        }
        if(!cpf || !cnpj || !nome || !telefone || !email) {
            res.status(400).json({
                erro: true,
                mensagem: "Todos os campos requeridos estao vazios, por gentileza realizar o preenchimento"
            })
        }

        const filtro = Object.fromEntries(
            Object.entries({
                cpf,
                cnpj,
                nome,
                telefone,
                email 
            }).filter(([,valor]) => {
                return(
                    valor !== undefined &&
                    valor !== null &&
                    valor !== ''
                )
            }
        
            )
        )

        if (Object.keys(filtro).length === 0) {
                res.status(400).json({
                erro: true,
                mensagem: 'Usuario nao encontrado, por gentileza realizar a inscricao ou entrar em contato com o email eventos@giraffas.com'
            })
        }
        const client = await supabase()
        const {data, error } = await client
        .schema(ambient)
        .from('EV_CADASTRO_CLIENTES')
        .select("*")
        .match(filtro)

        if(error) {
            console.error('Erro na consulta de inscricoes: ', error)
            res.status(500).json({
                erro: true,
                mensagem: "Erro na consulta de inscricoes na base de dados",
                msg_erro: error
            })
        }   
        if (!data || data.length === 0) {
            return res.status(401).json({
                erro: true,
                mensagem: "Inscrição não encontrada com base nos dados informados"
            });
        }
            const token = geraToken(data.nome, data.nome,res)
            res.status(200).json({
                sucess: true,
                mensagem: 'usuario encontrado no sistema',
                token: token,
                order:  [0]
            })
    }
    catch(err) {
        console.error('Erro interno na consulta de inscricoes: ', err)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro na consulta de inscricoes: ' + err
        })
    }
}