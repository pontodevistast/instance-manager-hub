/**
 * Utilitário para chamadas à API UaZapi
 * Suporta JSON e respostas em texto puro (Base64)
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
    'Accept': 'application/json, text/plain, */*',
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.adminToken) {
    headers['admintoken'] = options.adminToken;
  }

  if (options.instanceToken) {
    headers['token'] = options.instanceToken;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type');

  if (!response.ok) {
    let errorMsg = `Erro na API: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch (e) {
      // Se não for JSON, tenta ler texto
      const text = await response.text().catch(() => '');
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  // Tenta retornar JSON, se falhar retorna texto puro
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  } else {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }
}