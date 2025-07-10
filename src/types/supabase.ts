export interface JsonObject {
  [key: string]: Json | undefined
}
export type Json =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          user_id: string
          value: string
        }
        Insert: {
          key: string
          user_id: string
          value: string
        }
        Update: {
          key?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      bank_info: {
        Row: {
          account_number: string
          bank_address: string
          bank_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          id: number
          swift_code: string
          user_id: string
        }
        Insert: {
          account_number: string
          bank_address: string
          bank_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          id?: number
          swift_code: string
          user_id: string
        }
        Update: {
          account_number?: string
          bank_address?: string
          bank_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          id?: number
          swift_code?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string
          id: number
          name: string
          user_id: string
        }
        Insert: {
          address: string
          id?: number
          name: string
          user_id: string
        }
        Update: {
          address?: string
          id?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client: string
          client_address: string
          client_reference: string
          currency: string
          date: string
          expenses_included: boolean
          id: number
          invoice_number: string
          items: Json
          project_reference: string
          rendered_service: string
          status: "Paid" | "Unpaid" | "Overdue" | null
          tax_rate: number
          total: number
          travel_dates: string[] | null
          user_id: string
          work_dates: string[] | null
        }
        Insert: {
          client: string
          client_address: string
          client_reference: string
          currency: string
          date: string
          expenses_included: boolean
          id?: number
          invoice_number: string
          items?: Json
          project_reference: string
          rendered_service: string
          status?: "Paid" | "Unpaid" | "Overdue" | null
          tax_rate: number
          total: number
          travel_dates?: string[] | null
          user_id: string
          work_dates?: string[] | null
        }
        Update: {
          client?: string
          client_address?: string
          client_reference?: string
          currency?: string
          date?: string
          expenses_included?: boolean
          id?: number
          invoice_number?: string
          items?: Json
          project_reference?: string
          rendered_service?: string
          status?: "Paid" | "Unpaid" | "Overdue" | null
          tax_rate?: number
          total?: number
          travel_dates?: string[] | null
          user_id?: string
          work_dates?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          credits: number | null
          email: string | null
          id: string
          is_admin: boolean | null
          status: "active" | "deactivated" | null
        }
        Insert: {
          credits?: number | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          status?: "active" | "deactivated" | null
        }
        Update: {
          credits?: number | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          status?: "active" | "deactivated" | null
        }
        Relationships: []
      }
      sender_info: {
        Row: {
          address: string
          id: number
          name: string
          phone: string
          user_id: string
        }
        Insert: {
          address: string
          id?: number
          name: string
          phone: string
          user_id: string
        }
        Update: {
          address?: string
          id?: number
          name?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      admin_count_invoices_per_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string | null
          invoice_count: number
        }[]
      }
      admin_get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string | null
          credits: number | null
          is_admin: boolean | null
          status: string | null
          last_sign_in_at: string | null
          email_confirmed_at: string | null
        }[]
      }
      handle_soft_delete_user: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      invoice_status: "Paid" | "Unpaid" | "Overdue"
      user_status: "active" | "deactivated"
    }
    CompositeTypes: {}
  }
}

// Helper types for easier access
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export type ClientRow = Database['public']['Tables']['clients']['Row'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export type SenderInfoRow = Database['public']['Tables']['sender_info']['Row'];
export type SenderInfoInsert = Database['public']['Tables']['sender_info']['Insert'];
export type SenderInfoUpdate = Database['public']['Tables']['sender_info']['Update'];

export type BankInfoRow = Database['public']['Tables']['bank_info']['Row'];
export type BankInfoInsert = Database['public']['Tables']['bank_info']['Insert'];
export type BankInfoUpdate = Database['public']['Tables']['bank_info']['Update'];

export type AppSettingsRow = Database['public']['Tables']['app_settings']['Row'];
export type AppSettingsInsert = Database['public']['Tables']['app_settings']['Insert'];
export type AppSettingsUpdate = Database['public']['Tables']['app_settings']['Update'];

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Type for the return of the 'admin_get_all_users' RPC
type AdminGetAllUsersReturn = Database['public']['Functions']['admin_get_all_users']['Returns'];
export type AdminUserView = AdminGetAllUsersReturn extends (infer U)[] ? U : never;