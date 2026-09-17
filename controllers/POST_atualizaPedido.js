import supabase from "../database/supabase.js";
import pathAbsolute from "../functions/pathAbsolute.js";
import getDataEvento from "./GET_consultaDataEvento.js";
import calculaData from "../functions/calculaData.js";
import { config } from "dotenv";

export default async function postAtualizaPedidos(req, res) {
    try {
    
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const ambient = process.env.AMBIENT
        
        const {nome_evento, filtros = {}, dados = {}} = req.body
        
        const {email, cpf} = filtros 
        const {horario_embarque, regiao_embarque} = dados
        
        const database = await getDataEvento(nome_evento)
        const dataCalculada = calculaData(database.data_evento);
        if (dataCalculada < 30) {
            return res.status(400).json({
            erro: true,
            mensagem:
                "As reservas nao podem ser feitas 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com",
            });
        }

        const filtro  = Object.fromEntries(
            Object.entries({
                email, cpf
            }).filter(([, valor]) => {
                return(
                   
                    valor !== undefined &&
                    valor !== null &&
                    valor !== ''
                )
            })
        )
        const update = Object.fromEntries(
            Object.entries({
                horario_embarque,  regiao_embarque
            }).filter(([, valor]) => {
                return (
                   
                    valor !== undefined &&
                    valor !== null &&
                    valor !== ''
                )
            })
        )
        
        if (Object.keys(filtro).length === 0 ) {
            console.error('Erro ao atualizar informacoes do pedido, nenhum filtro foi aplicado')
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao atualizar informacoes do pedido, nenhum filtro foi aplicado'
            })
        }
        if (Object.keys(update).length === 0 ) {
            console.error('Erro ao atualizar informacoes do pedido, nenhum dado de update foi informado')
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao atualizar informacoes do pedido, nenhum dado de update foi informado'
            })
        }
        const client = await supabase()
        const {data, error} = await client
        .schema(ambient)
        .from('EV_PEDIDOS')
        .update(update)
        .match(filtro)
        .select('*')


        if(error) {
            console.error('Erro na atualizacao de pedidos ',error)
            res.status(400).json({
                erro: true,
                mensagem: 'Erro na atualizacao de pedidos',
                msg_erro: error
            })
        }

        if(!data || data.length == 0) {
            console.error('Erro na atualizacao de pedidos, PEDIDO NAO LOCALIZADO')
            res.status(400).json({
                errro: true,
                mensagem:'Erro na atualizacao de pedidos, PEDIDO NAO LOCALIZADO',
                
            })
        }
        res.status(200).json({
            sucess: true,
            mensagem: "Informacoes de embarque e desembarque atualizados com sucesso"
        })


    }   
    catch(err){
        console.error('Erro ao atualizar informacoes do pedido  ', err)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro ao atualizar informacoes do pedio',
            msg_erro: err
        })
    }
}