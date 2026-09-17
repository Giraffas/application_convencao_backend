import jwt from 'jsonwebtoken'
import pathAbsolute from './pathAbsolute.js'
import { config } from 'dotenv'

export default function geraToken(nome, usuario, res) {
    try {
        const direnv = pathAbsolute('.env')
        config({path: direnv})
        const token = jwt.sign(
                {
                    nome:nome
                },
                process.env.JWT_SECRET,
                {
                    algorithm: "HS256",
                    subject: String(usuario),
                    issuer: "application-eventos",
                    audience: "application-eventos-api",
                    expiresIn: "30h"
                }  
        ) 
        return token
    }
    catch(err) {
        console.error('Erro na geracao do JWT ',err)
        res.status(500).json({
            erro: true,
            mensagem: 'Erro na geracao do token de acesso'
        })
    }
  
}