export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          day: string
          id: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          day?: string
          id?: string
          tokens_used?: number
          user_id?: string
        }
        Update: {
          day?: string
          id?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          body: string
          created_at: string
          id: string
          job_id: string | null
          kind: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind: string
          read?: boolean
          title: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_packages: {
        Row: {
          answers: Json
          application_id: string | null
          cover_letter: string
          created_at: string
          id: string
          job_id: string | null
          resume_version_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          application_id?: string | null
          cover_letter?: string
          created_at?: string
          id?: string
          job_id?: string | null
          resume_version_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          answers?: Json
          application_id?: string | null
          cover_letter?: string
          created_at?: string
          id?: string
          job_id?: string | null
          resume_version_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_packages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string | null
          company: string
          created_at: string
          id: string
          job_id: string | null
          notes: string
          status: string
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string
          status?: string
          title: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Update: {
          applied_at?: string | null
          company?: string
          created_at?: string
          id?: string
          job_id?: string | null
          notes?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          application_id: string
          body: string
          channel: string
          created_at: string
          due_at: string
          id: string
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          application_id: string
          body?: string
          channel: string
          created_at?: string
          due_at: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Update: {
          application_id?: string
          body?: string
          channel?: string
          created_at?: string
          due_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_encrypted: string | null
          connected_at: string
          id: string
          provider: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          access_encrypted?: string | null
          connected_at?: string
          id?: string
          provider: string
          scopes?: string[]
          user_id?: string
        }
        Update: {
          access_encrypted?: string | null
          connected_at?: string
          id?: string
          provider?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      job_scores: {
        Row: {
          created_at: string
          id: string
          job_id: string
          llm_score: number
          model: string
          reason: string
          resume_id: string
          rule_applied: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          llm_score: number
          model?: string
          reason?: string
          resume_id: string
          rule_applied?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          llm_score?: number
          model?: string
          reason?: string
          resume_id?: string
          rule_applied?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_scores_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ats: string
          company: string
          description: string | null
          external_id: string
          first_seen_at: string
          id: string
          last_seen_at: string
          location: string | null
          match_score: number | null
          matched_keywords: string[]
          missing_keywords: string[]
          status: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          ats: string
          company: string
          description?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          location?: string | null
          match_score?: number | null
          matched_keywords?: string[]
          missing_keywords?: string[]
          status?: string
          title: string
          url?: string | null
          user_id?: string
        }
        Update: {
          ats?: string
          company?: string
          description?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          location?: string | null
          match_score?: number | null
          matched_keywords?: string[]
          missing_keywords?: string[]
          status?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alert_email: boolean
          created_at: string
          daily_digest: boolean
          display_name: string | null
          id: string
          llm_api_key_encrypted: string | null
          locations: string[]
          remote: boolean
          salary_min: number | null
          seniority: string | null
          target_roles: string[]
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          alert_email?: boolean
          created_at?: string
          daily_digest?: boolean
          display_name?: string | null
          id?: string
          llm_api_key_encrypted?: string | null
          locations?: string[]
          remote?: boolean
          salary_min?: number | null
          seniority?: string | null
          target_roles?: string[]
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Update: {
          alert_email?: boolean
          created_at?: string
          daily_digest?: boolean
          display_name?: string | null
          id?: string
          llm_api_key_encrypted?: string | null
          locations?: string[]
          remote?: boolean
          salary_min?: number | null
          seniority?: string | null
          target_roles?: string[]
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          content: string
          created_at: string
          id: string
          job_id: string | null
          kind: string
          label: string
          resume_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          label?: string
          resume_id: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          label?: string
          resume_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          parsed: Json | null
          title: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          parsed?: Json | null
          title?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          parsed?: Json | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      watched_companies: {
        Row: {
          ats: string
          created_at: string
          id: string
          last_scanned_at: string | null
          name: string
          slug: string
          user_id: string
        }
        Insert: {
          ats: string
          created_at?: string
          id?: string
          last_scanned_at?: string | null
          name: string
          slug: string
          user_id?: string
        }
        Update: {
          ats?: string
          created_at?: string
          id?: string
          last_scanned_at?: string | null
          name?: string
          slug?: string
          user_id?: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
