import calculaData from "../functions/calculaData.js";
import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import postCancelaInscricao from "../controllers/POST_cancelaReserva.js";
import postCancelaReservaInscricao from '../controllers/POST_cancelaReservaCadastro.js'
export default async function hookCancelaParticipacao(req, res) {
    try {
        
        const {nome_evento} = req.body
        const {cpf, email} = req.body
        const REQdataEvento = await getDataEvento(nome_evento, res)        

        if(!REQdataEvento) {
            res.status(400).json({
                erro: true,
                mensagem: 'Erro ao consultar data do evento'
            })
        }

        const dataEvento = REQdataEvento.data_evento

        const qtDias = calculaData(dataEvento)

        
        if(qtDias < 30) {
            res.status(400).json({
                erro: true,
                mensagem: 'As reservas nao podem ser canceladas com menos de 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com'
            })
        }

        const cancelamento = await postCancelaInscricao(cpf, email)
        
        if (cancelamento == "status500") {
            res.status(500).json({
                erro: true,
                mensagem: 'Erro ao gerar cancelamento de reservar, ERRO INTERNO NO SERVIDOR'
            })
        }
        if (cancelamento == 'status400') {
            res.status(400).json({
                erro: true, 
                mensagem: 'Erro ao gerar cancelamento da reserva, BAD REQUEST'
            })
        }
        const cancelamentoCadastro = await postCancelaReservaInscricao(cpf, email)
         if (cancelamentoCadastro == "status500") {
            res.status(500).json({
                erro: true,
                mensagem: 'Erro ao gerar cancelamento de reservar, ERRO INTERNO NO SERVIDOR'
            })
        }
        if (cancelamentoCadastro == 'status400') {
            res.status(400).json({
                erro: true, 
                mensagem: 'Erro ao gerar cancelamento da reserva, BAD REQUEST'
            })
        }
        res.status(200).json({
            sucess: true,
            mensagem: 'Reserva cancelada com sucesso'
        })
    }
    catch (err) {
        console.error('Erro ao executar hook de cancelamento de evento ', err)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro ao executar hook de cancelamento de evento',
            msg_erro: err
        })
    }
}