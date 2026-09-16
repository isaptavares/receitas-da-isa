---
description: Como acessar o localhost através do celular criando um link temporário com localtunnel
---

Este workflow explica o processo para gerar um link temporário e acessar o site em desenvolvimento através do celular.

## Passo a Passo Padrão (Localtunnel)

1. **Inicie o servidor local (se ainda não estiver rodando):**
   ```cmd
   python -m http.server 8080
   ```

2. **Gere o link temporário do localtunnel:**
   ```cmd
   npx --yes localtunnel --port 8080
   ```

3. **Obtenha a senha de acesso (IP público):**
   ```powershell
   powershell -Command "(Invoke-WebRequest -UseBasicParsing https://api.ipify.org).Content"
   ```

4. **Acesse no celular:**
   - Abra o link retornado pelo localtunnel (ex: `https://...loca.lt`).
   - Se for solicitada a senha (*Tunnel Password*), insira o IP público gerado no passo 3.

> **Nota para o Agente (Antigravity):** Sempre que a usuária pedir para acessar ou abrir no mobile, execute o `localtunnel` na porta 8080 e forneça o link `https://...loca.lt` acompanhado da senha IP pública!
