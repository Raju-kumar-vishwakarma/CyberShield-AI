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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_detection_scans: {
        Row: {
          ai_score: number
          analysis: string | null
          authentic_score: number
          confidence: number
          created_at: string
          file_name: string
          id: string
          is_ai_generated: boolean
          media_type: string
          risk_level: string
          strict_mode: boolean
          user_id: string | null
        }
        Insert: {
          ai_score?: number
          analysis?: string | null
          authentic_score?: number
          confidence?: number
          created_at?: string
          file_name: string
          id?: string
          is_ai_generated?: boolean
          media_type?: string
          risk_level?: string
          strict_mode?: boolean
          user_id?: string | null
        }
        Update: {
          ai_score?: number
          analysis?: string | null
          authentic_score?: number
          confidence?: number
          created_at?: string
          file_name?: string
          id?: string
          is_ai_generated?: boolean
          media_type?: string
          risk_level?: string
          strict_mode?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          auto_delete: boolean
          content: string
          created_at: string
          id: string
          is_ai: boolean
          sender_name: string
        }
        Insert: {
          auto_delete?: boolean
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          sender_name: string
        }
        Update: {
          auto_delete?: boolean
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          sender_name?: string
        }
        Relationships: []
      }
      email_breach_checks: {
        Row: {
          ai_analysis: string | null
          breach_count: number | null
          breach_sources: string[] | null
          created_at: string
          email: string
          id: string
          is_breached: boolean | null
          last_checked_at: string
        }
        Insert: {
          ai_analysis?: string | null
          breach_count?: number | null
          breach_sources?: string[] | null
          created_at?: string
          email: string
          id?: string
          is_breached?: boolean | null
          last_checked_at?: string
        }
        Update: {
          ai_analysis?: string | null
          breach_count?: number | null
          breach_sources?: string[] | null
          created_at?: string
          email?: string
          id?: string
          is_breached?: boolean | null
          last_checked_at?: string
        }
        Relationships: []
      }
      honeypot_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string
          location: string | null
          severity: string
          user_agent: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address: string
          location?: string | null
          severity?: string
          user_agent?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string
          location?: string | null
          severity?: string
          user_agent?: string | null
          username?: string | null
        }
        Relationships: []
      }
      network_threats: {
        Row: {
          ai_analysis: string | null
          bytes_transferred: string | null
          confidence: number | null
          created_at: string
          destination: string
          detected_at: string
          id: string
          protocol: string
          severity: string
          source_ip: string
          status: string
          threat_type: string | null
        }
        Insert: {
          ai_analysis?: string | null
          bytes_transferred?: string | null
          confidence?: number | null
          created_at?: string
          destination: string
          detected_at?: string
          id?: string
          protocol: string
          severity?: string
          source_ip: string
          status?: string
          threat_type?: string | null
        }
        Update: {
          ai_analysis?: string | null
          bytes_transferred?: string | null
          confidence?: number | null
          created_at?: string
          destination?: string
          detected_at?: string
          id?: string
          protocol?: string
          severity?: string
          source_ip?: string
          status?: string
          threat_type?: string | null
        }
        Relationships: []
      }
      phishing_scans: {
        Row: {
          ai_analysis: string | null
          confidence: number | null
          content_preview: string | null
          created_at: string
          detected_urls: string[] | null
          id: string
          scanned_at: string
          status: string
          threat_indicators: Json | null
        }
        Insert: {
          ai_analysis?: string | null
          confidence?: number | null
          content_preview?: string | null
          created_at?: string
          detected_urls?: string[] | null
          id?: string
          scanned_at?: string
          status?: string
          threat_indicators?: Json | null
        }
        Update: {
          ai_analysis?: string | null
          confidence?: number | null
          content_preview?: string | null
          created_at?: string
          detected_urls?: string[] | null
          id?: string
          scanned_at?: string
          status?: string
          threat_indicators?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ssl_checks: {
        Row: {
          checked_at: string
          created_at: string
          domain: string
          expires_at: string | null
          grade: string | null
          id: string
          is_valid: boolean | null
          issuer: string | null
          vulnerabilities: string[] | null
        }
        Insert: {
          checked_at?: string
          created_at?: string
          domain: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          is_valid?: boolean | null
          issuer?: string | null
          vulnerabilities?: string[] | null
        }
        Update: {
          checked_at?: string
          created_at?: string
          domain?: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          is_valid?: boolean | null
          issuer?: string | null
          vulnerabilities?: string[] | null
        }
        Relationships: []
      }
      steel_security_scans: {
        Row: {
          ai_analysis: string | null
          created_at: string | null
          dom_analysis: Json | null
          external_links: Json | null
          final_url: string | null
          has_credit_card_field: boolean | null
          has_login_form: boolean | null
          has_password_field: boolean | null
          id: string
          page_title: string | null
          redirect_chain: Json | null
          risk_level: string | null
          risk_score: number | null
          scanned_at: string | null
          screenshot_base64: string | null
          ssl_valid: boolean | null
          suspicious_scripts: Json | null
          threat_indicators: Json | null
          url: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string | null
          dom_analysis?: Json | null
          external_links?: Json | null
          final_url?: string | null
          has_credit_card_field?: boolean | null
          has_login_form?: boolean | null
          has_password_field?: boolean | null
          id?: string
          page_title?: string | null
          redirect_chain?: Json | null
          risk_level?: string | null
          risk_score?: number | null
          scanned_at?: string | null
          screenshot_base64?: string | null
          ssl_valid?: boolean | null
          suspicious_scripts?: Json | null
          threat_indicators?: Json | null
          url: string
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string | null
          dom_analysis?: Json | null
          external_links?: Json | null
          final_url?: string | null
          has_credit_card_field?: boolean | null
          has_login_form?: boolean | null
          has_password_field?: boolean | null
          id?: string
          page_title?: string | null
          redirect_chain?: Json | null
          risk_level?: string | null
          risk_score?: number | null
          scanned_at?: string | null
          screenshot_base64?: string | null
          ssl_valid?: boolean | null
          suspicious_scripts?: Json | null
          threat_indicators?: Json | null
          url?: string
        }
        Relationships: []
      }
      suspicious_ips: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          ip_address: string
          is_blocked: boolean
          last_seen_at: string
          location: string | null
          severity: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          ip_address: string
          is_blocked?: boolean
          last_seen_at?: string
          location?: string | null
          severity?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          ip_address?: string
          is_blocked?: boolean
          last_seen_at?: string
          location?: string | null
          severity?: string
        }
        Relationships: []
      }
      threat_analytics: {
        Row: {
          count: number
          created_at: string
          date: string
          id: string
          severity: string
          threat_type: string
        }
        Insert: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          severity?: string
          threat_type: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          severity?: string
          threat_type?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
