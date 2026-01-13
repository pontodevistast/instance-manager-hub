/**
 * Utilitário para chamadas à API UaZapi
 * Baseado na documentação técnica fornecida (curl)
 */

interface RequestOptions {
  method?: string;
  body?: any;
  adminToken?: string;
  instanceToken?: string;
}

export async function uazapiFetch(baseUrl: string, endpoint: string, options: RequestOptions = {}) {
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Se tiver adminToken, usa o cabeçalho admintoken (padrão administrativo)
  if (options.adminToken) {
    headers['admintoken'] = options.adminToken;
  }

  // Se tiver instanceToken, usa o cabeçalho token (padrão de instância específica)
  if (options.instanceToken) {
    headers['token'] = options.instanceToken;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erro na API: ${response.statusText}`);
  }

  return response.json();
}