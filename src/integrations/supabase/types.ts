export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            ghl_agency_tokens: {
                Row: {
                    access_token: string
                    company_id: string | null
                    created_at: string | null
                    expires_at: string | null
                    id: string
                    location_id: string | null
                    refresh_token: string
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    access_token: string
                    company_id?: string | null
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    location_id?: string | null
                    refresh_token: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    access_token?: string
                    company_id?: string | null
                    created_at?: string | null
                    expires_at?: string | null
                    id?: string
                    location_id?: string | null
                    refresh_token?: string
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ghl_agency_tokens_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            ghl_automation_config: {
                Row: {
                    agent_prompt: string | null
                    ai_settings: Json | null
                    created_at: string | null
                    delay_seconds: number | null
                    gemini_api_key: string | null
                    ghl_pipeline_id: string | null
                    is_active: boolean | null
                    kanban_prompt: string | null
                    knowledge_base: string | null
                    location_id: string
                    stage_mappings: Json | null
                    updated_at: string | null
                }
                Insert: {
                    agent_prompt?: string | null
                    ai_settings?: Json | null
                    created_at?: string | null
                    delay_seconds?: number | null
                    gemini_api_key?: string | null
                    ghl_pipeline_id?: string | null
                    is_active?: boolean | null
                    kanban_prompt?: string | null
                    knowledge_base?: string | null
                    location_id: string
                    stage_mappings?: Json | null
                    updated_at?: string | null
                }
                Update: {
                    agent_prompt?: string | null
                    ai_settings?: Json | null
                    created_at?: string | null
                    delay_seconds?: number | null
                    gemini_api_key?: string | null
                    ghl_pipeline_id?: string | null
                    is_active?: boolean | null
                    kanban_prompt?: string | null
                    knowledge_base?: string | null
                    location_id?: string
                    stage_mappings?: Json | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            ghl_uazapi_config: {
                Row: {
                    account_name: string | null
                    api_base_url: string | null
                    api_token: string | null
                    created_at: string | null
                    ghl_token: string | null
                    ignore_groups: boolean | null
                    location_id: string
                    updated_at: string | null
                }
                Insert: {
                    account_name?: string | null
                    api_base_url?: string | null
                    api_token?: string | null
                    created_at?: string | null
                    ghl_token?: string | null
                    ignore_groups?: boolean | null
                    location_id: string
                    updated_at?: string | null
                }
                Update: {
                    account_name?: string | null
                    api_base_url?: string | null
                    api_token?: string | null
                    created_at?: string | null
                    ghl_token?: string | null
                    ignore_groups?: boolean | null
                    location_id?: string
                    updated_at?: string | null
                }
                Relationships: []
            }
            instances: {
                Row: {
                    created_at: string | null
                    ghl_user_id: string | null
                    id: string
                    instance_name: string | null
                    instance_token: string | null
                    last_heartbeat: string | null
                    location_id: string
                    qr_code: string | null
                    status: string | null
                    owner: string | null
                    profile_name: string | null
                    profile_pic_url: string | null
                    is_business: boolean | null
                    platform: string | null
                }
                Insert: {
                    created_at?: string | null
                    ghl_user_id?: string | null
                    id?: string
                    instance_name?: string | null
                    instance_token?: string | null
                    last_heartbeat?: string | null
                    location_id: string
                    qr_code?: string | null
                    status?: string | null
                    owner?: string | null
                    profile_name?: string | null
                    profile_pic_url?: string | null
                    is_business?: boolean | null
                    platform?: string | null
                }
                Update: {
                    created_at?: string | null
                    ghl_user_id?: string | null
                    id?: string
                    instance_name?: string | null
                    instance_token?: string | null
                    last_heartbeat?: string | null
                    location_id?: string
                    qr_code?: string | null
                    status?: string | null
                    owner?: string | null
                    profile_name?: string | null
                    profile_pic_url?: string | null
                    is_business?: boolean | null
                    platform?: string | null
                }
                Relationships: []
            }
            integration_settings: {
                Row: {
                    api_base_url: string
                    created_at: string | null
                    ghl_client_id: string | null
                    ghl_client_secret: string | null
                    global_api_token: string | null
                    location_id: string
                    updated_at: string | null
                    webhook_url: string | null
                }
                Insert: {
                    api_base_url?: string
                    created_at?: string | null
                    ghl_client_id?: string | null
                    ghl_client_secret?: string | null
                    global_api_token?: string | null
                    location_id: string
                    updated_at?: string | null
                    webhook_url?: string | null
                }
                Update: {
                    api_base_url?: string
                    created_at?: string | null
                    ghl_client_id?: string | null
                    ghl_client_secret?: string | null
                    global_api_token?: string | null
                    location_id?: string
                    updated_at?: string | null
                    webhook_url?: string | null
                }
                Relationships: []
            }
            unified_instance_ghl: {
                Row: {
                    account_name: string | null
                    api_base_url: string | null
                    api_token: string | null
                    created_at: string | null
                    ghl_token: string | null
                    ghl_user_id: string | null
                    id: string | null
                    ignore_groups: boolean | null
                    instance_name: string | null
                    instance_token: string | null
                    last_heartbeat: string | null
                    location_id: string | null
                    qr_code: string | null
                    status: string | null
                    updated_at: string | null
                }
                Insert: {
                    account_name?: string | null
                    api_base_url?: string | null
                    api_token?: string | null
                    created_at?: string | null
                    ghl_token?: string | null
                    ghl_user_id?: string | null
                    id?: string | null
                    ignore_groups?: boolean | null
                    instance_name?: string | null
                    instance_token?: string | null
                    last_heartbeat?: string | null
                    location_id?: string | null
                    qr_code?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Update: {
                    account_name?: string | null
                    api_base_url?: string | null
                    api_token?: string | null
                    created_at?: string | null
                    ghl_token?: string | null
                    ghl_user_id?: string | null
                    id?: string | null
                    ignore_groups?: boolean | null
                    instance_name?: string | null
                    instance_token?: string | null
                    last_heartbeat?: string | null
                    location_id?: string | null
                    qr_code?: string | null
                    status?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
