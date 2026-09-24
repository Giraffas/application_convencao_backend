import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { verificarEmail, diagnosticarErroEmail } from "../services/email.js";

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
if (/^[a-z0-9.-]+$/i.test(process.env.SMTP_HOST ?? '')) {
  console.log('Host SMTP configurado:', process.env.SMTP_HOST);
}

const limite = setTimeout(() => {
  console.error('Verificação SMTP excedeu 30 segundos. Verifique DNS, rede e acesso à porta SMTP neste ambiente.');
  process.exit(1);
}, 30000);

try {
  await verificarEmail();
  console.log('Conexão, TLS e autenticação SMTP verificados. Nenhuma mensagem enviada.');
} catch (error) {
  console.error('Falha na verificação SMTP:', diagnosticarErroEmail(error));
  process.exitCode = 1;
} finally {
  clearTimeout(limite);
}
