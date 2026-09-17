import postAlteracaoCheckout from "../controllers/POST_alteracaoCheckout.js";
import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import calculaData from "../functions/calculaData.js";
export default async function hookAlteraCheckout(req, res) {
    try {

        const {cpf, email, nova_data} = req.body 
        const {nome_evento} = req.body
        if(!nome_evento) {
            res.status(400).json({
                erro: true,
                mensagem: 'Informe o nome do evento para alteracao dda data de checkout'
            })
        }
        if (!cpf) {
            res.status(400).json({
                erro: true,
                mensagem: 'informe o cpf para realizar a alteracao de data'
            })
        }

        if(!email) {
            res.status(400).json({
                erro: true,
                mensagem: 'informe o email para realizar a alteracao da data'
            })
        }

        if(!nova_data) {
            res.status(400).json({
                erro: true,
                mensagem: 'informe uma nova data para realizar a alteracao'
            })
        }

        const dataEvento = await getDataEvento(nome_evento, res)
        
        if(!dataEvento) {
            console.error('Erro ao consultar data do evento')
            res.status(500).json({
                erro: true,
                mensagem: 'Erro ao consultar data do evento'
            })
        }
        
        const dataCalculada = calculaData(dataEvento.data_evento)
       

        if(dataCalculada < 30) {
            res.status(400).json({
                erro: true,
                mensagem: 'As reservas nao podem ser canceladas ou alteradas com menos de 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com'
            })
        }

        const alteracaoCheckout = await postAlteracaoCheckout(cpf,email,nova_data)

        if(alteracaoCheckout == false) {
            console.error('Erro interno ao executar alteracao de checkout')

            res.status(500).json({
                erro: true,
                mensagem: 'Erro interno ao executar alteracao de checkout'
            })
        }

        if(alteracaoCheckout == 'status400') {
            console.error('retorno da alterecao de checkout como status 400')
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao alterar data saida da reserva, BAD REQUEST'
            })
        }
        res.status(200).json({
            sucess: true,
            mensagem: 'Data da saida alterada com sucesso'
        })
    }   
    catch(error) {
        console.error('Erro no hook de alteracao de checkout:  ', error)
        res.status(500).json({
            erro: true, 
            mensagem: 'Erro no hook de alteracao de checkout',
            msg_erro: error
        })
    }

}