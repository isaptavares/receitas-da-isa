---
description: Como acessar o localhost (servidor local) através do celular usando o mesmo Wi-Fi
---

Este workflow explica o processo para descobrir o IP local da máquina e acessar o site em desenvolvimento através de um dispositivo móvel (celular/tablet) conectado à mesma rede Wi-Fi.

## Passo a Passo para Mobile Localhost

1. **Inicie o servidor local (se ainda não estiver rodando):**
   ```cmd
   python -m http.server 8080
   ```

2. **Descubra o IP local da sua máquina:**
   Execute o seguinte comando no terminal para listar as configurações de rede:
   ```cmd
   ipconfig
   ```

3. **Encontre o "Endereço IPv4":**
   Na saída do comando `ipconfig`, procure pela seção do seu adaptador de rede atual (geralmente "Adaptador de Rede sem Fio Wi-Fi" ou "Adaptador Ethernet") e copie o número na linha **Endereço IPv4** (exemplo: `192.168.x.x`).

4. **Acesse no celular:**
   Abra o navegador do seu celular (certifique-se de que ele está no mesmo Wi-Fi que o computador) e digite o IP descoberto seguido da porta do servidor:
   
   **Formato:** `http://[SEU_IPV4]:8080`
   **Exemplo:** `http://192.168.68.106:8080`

> **Nota para o Agente (Antigravity):** Quando a usuária pedir para "criar um localhost na versão mobile" ou perguntar "como acesso o localhost pelo celular", execute `ipconfig` usando a tool de comandos, extraia o Endereço IPv4, e envie para ela o link já formatado (ex: `http://192.168.x.x:8080`) para facilitar!
