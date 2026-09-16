# Diretrize de Desenvolvimento do Projeto

## 📱 Regra Absoluta: Foco Exclusivo no Mobile
- **NUNCA** edite o layout, estilos ou seções Desktop a menos que a usuária peça e aprove explicitamente.
- **TODAS** as edições, adaptações e ajustes de interface devem ser focadas exclusivamente na versão **Mobile** (`@media (max-width: ...)` ou elementos mobile).
- Se a sessão for definida como "só no mobile", **NÃO mexa em nenhum arquivo ou estilo desktop** sem explícita aprovação.
- Na dúvida se uma alteração afeta o Desktop, **NÃO modifique** e pergunte antes.

## 🔗 Regra de Acesso Mobile (Localhost / Servidor)
- Sempre que a usuária pedir para acessar ou testar o site no **mobile**, o padrão deve ser criar um link temporário com o **localtunnel** (`npx --yes localtunnel --port 8080`).
- Além de fornecer o link do localtunnel (`https://....loca.lt`), forneça também a senha (o IP público obtido por `powershell -Command "(Invoke-WebRequest -UseBasicParsing https://api.ipify.org).Content"`).

