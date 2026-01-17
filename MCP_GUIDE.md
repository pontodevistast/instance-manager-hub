# Guia de Capacidades e Configuração MCP

Este guia explica o que é necessário para cada MCP instalado no `unified_mcp_config.json` e o que eles habilitam de novo no seu assistente.

## ✅ Pré-requisitos (Preencha no JSON)

Antes de usar, você deve substituir os valores `PLACEHOLDER` no arquivo `unified_mcp_config.json` pelas suas credenciais reais.

| MCP | Variável(is) Necessária(s) | Onde conseguir |
| :--- | :--- | :--- |
| **Rube (Composio)** | `COMPOSIO_API_KEY` | [Composio Dashboard](https://app.composio.dev/settings/api-keys) |
| **n8n** | `N8N_API_KEY`, `N8N_API_URL` | Seu n8n > Settings > API |
| **GitHub** | `GITHUB_PERSONAL_ACCESS_TOKEN` | [GitHub Tokens](https://github.com/settings/tokens) (Scopes: repo, workflow) |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase > Project Settings > API |
| **Firebase** | `GOOGLE_APPLICATION_CREDENTIALS` | Caminho local para seu JSON de Service Account |
| **Postgres** | `POSTGRES_CONNECTION_STRING` | String de conexão do seu banco |
| **Notion** | `NOTION_API_KEY` | [Notion Integrations](https://www.notion.so/my-integrations) |
| **Brave Search** | `BRAVE_API_KEY` | [Brave Search API](https://brave.com/search/api/) |
| **Cloudflare** | `CLOUDFLARE_API_TOKEN`, `ACCOUNT_ID` | [Cloudflare Tokens](https://dash.cloudflare.com/profile/api-tokens) |

---

## 🚀 O que cada MCP Habilita (Antes vs Depois)

### 1. RUBE (Composio) - 500+ Integrações
**O que é:** Um hub que conecta a centenas de apps (Slack, Gmail, Jira, Salesforce) via uma única API.
*   **Antes:** "Como faço para mandar um email quando X acontecer?" (Eu te dava o código para você implementar).
*   **Agora:** "Verifique se tenho novos emails de 'Alerta' e mande uma mensagem no Slack." (Eu posso conectar e executar a ação real).

### 2. CONTEXT7 (Upstash) - Documentação Real-time
**O que é:** Busca o contexto mais atualizado de documentações técnicas.
*   **Antes:** Eu usava meu conhecimento de treinamento (que pode estar desatualizado).
*   **Agora:** "Como uso a nova feature Server Actions do Next.js 15?" (Eu busco a doc oficial atualizada em tempo real).

### 3. N8N MCP - Controle Total
**O que é:** Interface direta com sua instância do n8n.
*   **Antes:** "Crie um workflow..." (Eu gerava o JSON para você importar).
*   **Agora:** "ative o workflow 'Leads GHL' e me diga se a última execução falhou." (Eu acesso seu n8n, verifico logs e ativo/desativo workflows).

### 4. PLAYWRIGHT & PUPPETEER - Automação de Browser
**O que é:** Permite controlar um navegador headless.
*   **Antes:** "O site X mudou o layout?" (Eu não podia ver).
*   **Agora:** "Acesse meusite.com, tire um screenshot da home e verifique se o botão de login está visível."

### 5. GITHUB MCP - Gestão de Código
**O que é:** Acesso direto à API do GitHub.
*   **Antes:** "Crie uma issue..." (Eu não podia).
*   **Agora:** "Crie uma branch 'fix-auth', faça commit das mudanças atuais e abra um PR descrevendo o que fizemos."

### 6. SUPABASE & POSTGRES - Banco de Dados
**O que é:** Acesso direto aos dados.
*   **Antes:** "Escreva uma query SQL..." (Você tinha que rodar).
*   **Agora:** "Liste os últimos 5 usuários cadastrados na tabela 'users' e verifique se o email deles está confirmado." (Eu rodo a query e analiso os dados).

### 7. SEQUENTIAL THINKING - Raciocínio Complexo
**O que é:** Uma ferramenta meta-cognitiva que me força a pensar passo-a-passo.
*   **Antes:** Eu tentava resolver problemas complexos de uma vez.
*   **Agora:** "Analise a causa raiz desse bug de race condition." (Eu uso a ferramenta para quebrar o problema em hipóteses testáveis sequencialmente).

### 8. MEMORY - Memória de Longo Prazo
**O que é:** Um grafo de conhecimento persistente.
*   **Antes:** Se você fechasse o chat, eu esquecia nossas preferências.
*   **Agora:** "Lembre-se que eu prefiro Tailwind no lugar de CSS puro." (Eu salvo isso no grafo de memória e uso em futuras conversas).

### 9. BRAVE SEARCH - Busca na Web
**O que é:** Pesquisa na internet focada em privacidade e precisão.
*   **Antes:** Dependia de ferramentas de busca genéricas ou conhecimento interno.
*   **Agora:** "Busque qual a última versão estável do React Native." (Eu faço a busca atual e trago a resposta).
