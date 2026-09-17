import postAlteracaoChecking from "../controllers/POST_alteracaoChecking.js";
import getDataEvento from "../controllers/GET_consultaDataEvento.js";
import calculaData from "../functions/calculaData.js";

export default async function hookAlteraChecking(req, res) {
    const {
            nome,
            email,
            nome_evento,
            nova_data 
        } = req.body

    if(!nome){
        res.status(400).json({
            erro: true,
            mensagem: 'Preencha o campo nome, para alteracao da data de checking'
        })
    }

    if(!email){
        res.status(400).json({
            erro: true,
            mensagem: 'Preencha o campo email, para alteracao da data de checking'
        })
    }
    if(!nome_evento){
        res.status(400).json({
            erro: true,
            mensagem: 'Preencha o nome do evento , para alteracao da data de checking'
        })
    }
    if(!nova_data){
        res.status(400).json({
            erro: true,
            mensagem: 'Preencha a nova data , para alteracao da data de checking'
        })
    }

    const dataEvento = await getDataEvento(nome_evento, res)
    const dataCalculada = calculaData(dataEvento.data_evento)
    if(dataCalculada < 30) {
        res.status(400).json({
            erro: true,
            mensagem: 'As reservas nao podem ser canceladas ou alteradas com menos de 30 dias de antecedencia, em caso de duvidas, entre em contato com enventos@giraffas.com'
        })
    }

    const alteracao = await postAlteracaoChecking(nome, email, nova_data)
    if(alteracao == false) {
        res.status(500).json({
            erro: true,
            mensagem: 'Erro interno ao executar alteracao de cheking'
        })
    }

    if(alteracao == 'status400') {
        res.status(400).json({
            erro: true,
            mensagem: 'Erro ao alterar data saida da reserva, BAD REQUEST'
        })
    }
     
    res.status(200).json({
        sucess: true,
        mensagem: 'Alteracao da data de embarque realizada com sucesso'
    })

}