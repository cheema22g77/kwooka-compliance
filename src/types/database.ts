// Database types for Supabase
// Generate these types using: npx supabase gen types typescript --project-id your-project-id > src/types/database.ts

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
          email: string
          full_name: string | null
          company_name: string | null
          role: 'admin' | 'manager' | 'user'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          role?: 'admin' | 'manager' | 'user'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          role?: 'admin' | 'manager' | 'user'
          avatar_url?: string | null
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
          file_url: string | null
          file_type: string | null
          category: string
          status: 'pending' | 'reviewing' | 'approved' | 'rejected'
          ai_analysis: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          category: string
          status?: 'pending' | 'reviewing' | 'approved' | 'rejected'
          ai_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          file_url?: string | null
          file_type?: string | null
          category?: string
          status?: 'pending' | 'reviewing' | 'approved' | 'rejected'
          ai_analysis?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      findings: {
        Row: {
          id: string
          document_id: string | null
          user_id: string
          title: string
          description: string
          severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
          status: 'open' | 'in_progress' | 'resolved' | 'dismissed'
          category: string
          due_date: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id?: string | null
          user_id: string
          title: string
          description: string
          severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
          status?: 'open' | 'in_progress' | 'resolved' | 'dismissed'
          category: string
          due_date?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string | null
          user_id?: string
          title?: string
          description?: string
          severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
          status?: 'open' | 'in_progress' | 'resolved' | 'dismissed'
          category?: string
          due_date?: string | null
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
          version: string
          requirements: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          version: string
          requirements: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          version?: string
          requirements?: Json
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
      user_role: 'admin' | 'manager' | 'user'
      document_status: 'pending' | 'reviewing' | 'approved' | 'rejected'
      finding_severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
      finding_status: 'open' | 'in_progress' | 'resolved' | 'dismissed'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
