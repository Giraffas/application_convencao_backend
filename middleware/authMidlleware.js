import jwt from 'jsonwebtoken'
import pathAbsolute from '../functions/pathAbsolute.js'
import { config } from 'dotenv'
export default async function authMiddleware(req, res, next) {
    try {
        const direnv = pathAbsolute('.env')
        config({path:direnv})
       
        const authHeader = req.headers.authorization
        if(!authHeader) {
           return res.status(401).json({
                erro: true,
                mensagem: 'Acesso nao autorizado'
            })
        }
        const [tipo, token] = authHeader.split(' ')

        if (tipo !== "Bearer" || !token) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Token inválido"
            });
        }

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        req.usuario = payload
        next()

    }
    catch(error) {
        if (error.name === "TokenExpiredError") {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Token expirado"
            });
        }

        if (error.name === "JsonWebTokenError") {

            return res.status(401).json({
                sucesso: false,
                mensagem: "Token inválido"
            });
        }

        return res.status(401).json({
            sucesso: false,
            mensagem: "Não autorizado"
        });
 
    }}