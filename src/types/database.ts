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
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          file_url: string | null
          file_type: string | null
          file_size: number | null
          status: string
          ai_score: number | null
          ai_summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category: string
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          status?: string
          ai_score?: number | null
          ai_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          status?: string
          ai_score?: number | null
          ai_summary?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      findings: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          title: string
          description: string
          severity: string
          status: string
          category: string
          due_date: string | null
          assigned_to: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          title: string
          description: string
          severity: string
          status?: string
          category: string
          due_date?: string | null
          assigned_to?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          title?: string
          description?: string
          severity?: string
          status?: string
          category?: string
          due_date?: string | null
          assigned_to?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      compliance_frameworks: {
        Row: {
          id: string
          name: string
          description: string | null
          version: string | null
          total_requirements: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          version?: string | null
          total_requirements?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          version?: string | null
          total_requirements?: number
          created_at?: string
        }
      }
      user_compliance_progress: {
        Row: {
          id: string
          user_id: string
          framework_id: string
          completed_requirements: number
          compliance_score: number | null
          last_assessed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          framework_id: string
          completed_requirements?: number
          compliance_score?: number | null
          last_assessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          framework_id?: string
          completed_requirements?: number
          compliance_score?: number | null
          last_assessed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
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
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
