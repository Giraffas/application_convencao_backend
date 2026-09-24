# Confirmação de cadastro

As rotas `/hooks/cadastro` e `/hooks/cadastroevento` enviam a confirmação para
`clientes[0].email` depois que o cadastro é gravado com sucesso. O serviço
`services/emailConfirmacaoCadastro.js` preenche `base.html` e também produz uma
versão em texto simples. Os valores usados são os calculados pelo backend.

Configure no `.env` as variáveis utilizadas por `services/email.js`:

```dotenv
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
EMAIL_FROM="Giraffas <comunicacao@exemplo.com>"
```

A porta 465 usa TLS desde a conexão; as demais exigem STARTTLS.
Por solicitação, o transporte SMTP utiliza `tls.rejectUnauthorized: false`:
a conexão continua criptografada, mas a validade e a identidade do certificado
do servidor não são verificadas. Essa configuração se aplica somente ao SMTP.

Para verificar conexão, TLS e autenticação sem enviar mensagens ou cadastrar
outro pedido, execute `node scripts/verificarEmail.js` no ambiente do backend.
O diagnóstico e o log de falhas no cadastro mostram o código do erro e o status
SMTP quando disponível, sem imprimir senha ou resposta bruta do servidor.

A resposta de sucesso do cadastro inclui `email_enviado`: `true` quando o
servidor SMTP aceita o destinatário, ou `false` quando ocorre falha na montagem
ou no envio. Aceitação pelo SMTP não garante entrega na caixa de entrada.
Uma falha no envio mantém o HTTP 200 e o pedido confirmado, registra seu código
no log e não desfaz a gravação. Não repita o cadastro para reenviar o e-mail.
Não há fila nem tentativa automática de reenvio nesta implementação.

O envio é aguardado antes da resposta HTTP. O resumo inclui o código do pedido,
evento, empresa, quarto, preferência de cama, participantes, valor total,
divisão de pagamento e parcelas do responsável. A confirmação de cadastro
não é uma confirmação de pagamento.

Validação: `npm test` (ou `npm.cmd test` no PowerShell). Os testes simulam o
envio e não disparam mensagens reais.
