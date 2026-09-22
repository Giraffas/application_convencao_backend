// LIBS
import { Router } from "express";

//MIDLLEWARE
import authMiddleware from '../middleware/authMidlleware.js'

//HOOKS
import hookAutocompleteCnpj from "../hooks/autocompleteCnpj.js";
import hookCancelaParticipacao from "../hooks/cancelaParticipacao.js";
import hookAlteraCheckout from "../hooks/alteraCheckout.js";
import hookAlteraChecking from "../hooks/alteraChecking.js";
import hookCadastro from "../hooks/cadastroEvento.js";
import hookConfirmaConvite from "../hooks/confirmaConvite.js";
import hookReativaPedido from "../hooks/reativaPedido.js";

//POST
import postConsultaInscricao from "../controllers/POST_consultaInscricao.js";
import login from "../controllers/POST_login.js";
import postAtualizaPedidos from "../controllers/POST_atualizaPedido.js";
import postBaixaParcela from "../controllers/POST_baixaParcela.js";
import postReactiveInscricaoRoute from '../controllers/POST_cancelaReservaRoute.js'
import postResgataPedido from '../controllers/POST_resgataPedido.js'
import postValidaCnpj from "../controllers/POST_validaCnpj.js";
//GET
import getConsultaParcelas from '../controllers/GET_consultaParcelas.js'
import getClientesAtivos from "../controllers/GET_clientesAtivos.js";
import getClientesInativos from "../controllers/GET_clientesInativos.js";
import getRouterDataEvento from "../controllers/GET_routerDataEvento.js";
import getClientes from '../controllers/GET_clientes.js'

const router = Router()
console.log('Router aitvo')

router.post('/posts/auth/loginaadministrator', login)
router.post('/hooks/autocompletecnpj', hookAutocompleteCnpj)
router.post('/posts/consultas/consultainscricao', postConsultaInscricao)
router.post('/hooks/cadastro', hookCadastro)
router.post('/post/sellers/validasellers',postValidaCnpj)
router.use(authMiddleware)

router.get('/orders/paymanets/listpayments', getConsultaParcelas)
router.get('/sellers/active/sellersactive', getClientesAtivos)
router.get('/sellers/inactive/sellersinactive', getClientesInativos)
router.get('/events/date/dateevent', getRouterDataEvento)
router.get('/sellers/all/sellersall', getClientes)
router.post('/posts/orders/modify/ordercheckingcheckou', postAtualizaPedidos)
router.post('/posts/payments/administrator/check', postBaixaParcela)
router.post('/posts/orders/functions/reactiveOrder', postReactiveInscricaoRoute)
router.post('/orders/filterorder/getorder', postResgataPedido)
router.post('/hooks/cancelaParticipacao', hookCancelaParticipacao)
router.post('/hooks/alteraCheckout', hookAlteraCheckout)
router.post('/hooks/alteraChecking', hookAlteraChecking)
router.post('/hooks/cadastroevento', hookCadastro)
router.post('/hooks/resgateconvite', hookConfirmaConvite)
router.post('/hooks/orders/reactiveorders', hookReativaPedido)

export default router
