/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_GHL_CLIENT_ID: string
    readonly VITE_GHL_CLIENT_SECRET: string
    readonly VITE_UAZAPI_BASE_URL: string
    readonly VITE_UAZAPI_ADMIN_TOKEN: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
