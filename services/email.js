import nodemailer from 'nodemailer';

let transporter
function obterTransporter() {
    if (!transporter) {
      const ausentes = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM']
        .filter((campo) => !process.env[campo]?.trim());
      if (ausentes.length) {
        throw Object.assign(new Error('Configuração SMTP incompleta'), {
          code: 'ECONFIG', campos: ausentes,
        });
      }
      const port = Number(process.env.SMTP_PORT || 587);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw Object.assign(new Error('Porta SMTP inválida'), { code: 'ECONFIG', campos: ['SMTP_PORT'] });
      }

      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        // Mantém TLS, mas aceita o certificado SMTP sem validar sua identidade.
        tls: {
          rejectUnauthorized: false,
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        dnsTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      });
    }
    return transporter;
  }

export function diagnosticarErroEmail(error) {
  const causas = {
    ECONFIG: 'Configuração SMTP ausente ou inválida',
    EAUTH: 'Autenticação SMTP recusada; confira usuário, senha e permissão de envio SMTP',
    EDNS: 'Não foi possível resolver o endereço do servidor SMTP',
    ENOTFOUND: 'Servidor SMTP não encontrado no DNS',
    ECONNECTION: 'Não foi possível conectar ao servidor SMTP',
    ECONNREFUSED: 'Conexão SMTP recusada',
    ETIMEDOUT: 'Tempo limite ao conectar ou comunicar com o servidor SMTP',
    ESOCKET: 'Falha de conexão ou TLS com o servidor SMTP',
    ETLS: 'Falha ao estabelecer TLS com o servidor SMTP',
    EENVELOPE: 'Remetente ou destinatário recusado pelo servidor SMTP',
    EMESSAGE: 'Mensagem recusada pelo servidor SMTP',
    ENOENT: 'Arquivo do template de email não encontrado',
  };
  const codigo = Object.hasOwn(causas, error?.code ?? '') ? error.code : 'EMAIL_ERROR';
  const mensagem = String(error?.message ?? '').toLowerCase();
  const detalhes = [
    ['self-signed certificate', 'Certificado TLS autoassinado ou cadeia com certificado autoassinado'],
    ['unable to verify the first certificate', 'Não foi possível validar a cadeia do certificado TLS'],
    ['unable to get local issuer certificate', 'Autoridade emissora do certificado TLS não reconhecida'],
    ['certificate has expired', 'Certificado TLS expirado'],
    ['hostname/ip does not match', 'Certificado TLS não corresponde ao host configurado'],
    ['wrong version number', 'Protocolo TLS incompatível com a porta SMTP configurada'],
    ['econnrefused', 'Conexão recusada pelo host ou porta configurados'],
    ['enotfound', 'Host configurado não encontrado no DNS'],
  ];
  const detalhe = detalhes.find(([trecho]) => mensagem.includes(trecho))?.[1];
  const nomesCertificado = String(error?.cert?.subjectaltname ?? '')
    .split(', ').filter((nome) => /^DNS:[a-z0-9.*-]+$/i.test(nome));
  return {
    codigo,
    motivo: causas[codigo] ?? 'Falha ao preparar ou enviar o email',
    ...(detalhe ? { detalhe } : {}),
    ...(nomesCertificado.length ? { nomes_certificado: nomesCertificado } : {}),
    ...(Number.isInteger(error?.responseCode) ? { smtp_status: error.responseCode } : {}),
    ...(codigo === 'ECONFIG' ? { campos: error.campos } : {}),
  };
}

export async function verificarEmail() {
  return obterTransporter().verify();
}

export async function enviarEmail({ para, assunto, texto, html }) {
    const transporter = obterTransporter();

    return transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: para,
      subject: assunto,
      text: texto,
      html,
    });
  }
