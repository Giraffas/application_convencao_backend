import express from 'express'
import cors from 'cors'
import { config  } from 'dotenv'
import router from './routes/router.js'
config()

const port = `${process.env.SERVER_PORT}`

if(!port) {
    console.error('Configurar porta no servidor no arquivo .env')
}


const app = express()

app.use(cors({
  origin: [
    'https://convencoesgiraffas.com.br',
    'https://www.convencao2027.giraffas.com.br',
    'https://hml-convencao.giraffas.com.br',
    'http://localhost:4200'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(router)

app.listen(port)
console.log(`Servidor executando na porta: ${process.env.SERVER_PORT}`)
