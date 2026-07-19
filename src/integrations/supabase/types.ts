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
      app_config: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      changelog_entries: {
        Row: {
          autor: string | null
          categoria: Database["public"]["Enums"]["changelog_category"]
          created_at: string
          descricao: Json
          icon: string | null
          id: string
          image: string | null
          is_highlight: boolean
          published_at: string | null
          status: Database["public"]["Enums"]["document_status"]
          tags: string[]
          titulo: string
          updated_at: string
          versao: string
        }
        Insert: {
          autor?: string | null
          categoria?: Database["public"]["Enums"]["changelog_category"]
          created_at?: string
          descricao?: Json
          icon?: string | null
          id?: string
          image?: string | null
          is_highlight?: boolean
          published_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          tags?: string[]
          titulo: string
          updated_at?: string
          versao: string
        }
        Update: {
          autor?: string | null
          categoria?: Database["public"]["Enums"]["changelog_category"]
          created_at?: string
          descricao?: Json
          icon?: string | null
          id?: string
          image?: string | null
          is_highlight?: boolean
          published_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          tags?: string[]
          titulo?: string
          updated_at?: string
          versao?: string
        }
        Relationships: []
      }
      changelog_views: {
        Row: {
          entry_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          entry_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          entry_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_views_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_applied: number | null
          id: string
          plan_code: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_applied?: number | null
          id?: string
          plan_code?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_applied?: number | null
          id?: string
          plan_code?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          applies_to_plan_codes: string[]
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          free_days: number
          id: string
          max_uses: number | null
          metadata: Json
          starts_at: string | null
          updated_at: string
          uses_count: number
        }
        Insert: {
          active?: boolean
          applies_to_plan_codes?: string[]
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          free_days?: number
          id?: string
          max_uses?: number | null
          metadata?: Json
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Update: {
          active?: boolean
          applies_to_plan_codes?: string[]
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          free_days?: number
          id?: string
          max_uses?: number | null
          metadata?: Json
          starts_at?: string | null
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      credit_card_installments: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          id: string
          installment_number: number
          invoice_id: string | null
          purchase_id: string
          reference_month: string
          status: string
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          created_at?: string
          id?: string
          installment_number: number
          invoice_id?: string | null
          purchase_id: string
          reference_month: string
          status?: string
          total_installments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          id?: string
          installment_number?: number
          invoice_id?: string | null
          purchase_id?: string
          reference_month?: string
          status?: string
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_installments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "credit_card_installments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_installments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "credit_card_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_invoices: {
        Row: {
          card_id: string
          closing_date: string
          created_at: string
          due_date: string
          id: string
          paid_amount: number
          reference_month: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          closing_date: string
          created_at?: string
          due_date: string
          id?: string
          paid_amount?: number
          reference_month: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          closing_date?: string
          created_at?: string
          due_date?: string
          id?: string
          paid_amount?: number
          reference_month?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "credit_card_invoices_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_payments: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          payment_date: string
          source_account: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          payment_date?: string
          source_account?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          payment_date?: string
          source_account?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "credit_card_payments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "credit_card_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_purchases: {
        Row: {
          card_id: string
          category_id: string | null
          created_at: string
          description: string
          id: string
          installments_count: number
          is_recurring: boolean
          purchase_date: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_id: string
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          installments_count?: number
          is_recurring?: boolean
          purchase_date?: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_id?: string
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          installments_count?: number
          is_recurring?: boolean
          purchase_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_purchases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "credit_card_purchases_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_recurring: {
        Row: {
          amount: number
          card_id: string
          category_id: string | null
          created_at: string
          day_of_month: number
          description: string
          ends_on: string | null
          id: string
          is_active: boolean
          last_charged_month: string | null
          notes: string | null
          starts_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          card_id: string
          category_id?: string | null
          created_at?: string
          day_of_month: number
          description: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          last_charged_month?: string | null
          notes?: string | null
          starts_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          card_id?: string
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          description?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          last_charged_month?: string | null
          notes?: string | null
          starts_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_recurring_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_card_usage"
            referencedColumns: ["card_id"]
          },
          {
            foreignKeyName: "credit_card_recurring_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          bank: string | null
          brand: string | null
          closing_day: number
          color: string | null
          created_at: string
          credit_limit: number
          default_category_id: string | null
          due_day: number
          id: string
          is_active: boolean
          last_digits: string | null
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank?: string | null
          brand?: string | null
          closing_day: number
          color?: string | null
          created_at?: string
          credit_limit?: number
          default_category_id?: string | null
          due_day: number
          id?: string
          is_active?: boolean
          last_digits?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank?: string | null
          brand?: string | null
          closing_day?: number
          color?: string | null
          created_at?: string
          credit_limit?: number
          default_category_id?: string | null
          due_day?: number
          id?: string
          is_active?: boolean
          last_digits?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          autor: string | null
          conteudo: Json
          created_at: string
          document_id: string
          id: string
          resumo_alteracao: string | null
          subtitulo: string | null
          titulo: string
          versao: number
        }
        Insert: {
          autor?: string | null
          conteudo: Json
          created_at?: string
          document_id: string
          id?: string
          resumo_alteracao?: string | null
          subtitulo?: string | null
          titulo: string
          versao: number
        }
        Update: {
          autor?: string | null
          conteudo?: Json
          created_at?: string
          document_id?: string
          id?: string
          resumo_alteracao?: string | null
          subtitulo?: string | null
          titulo?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          autor: string | null
          conteudo: Json
          cover_image: string | null
          created_at: string
          icon: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_image: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["document_status"]
          subtitulo: string | null
          tipo: Database["public"]["Enums"]["document_type"]
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          autor?: string | null
          conteudo?: Json
          cover_image?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_image?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["document_status"]
          subtitulo?: string | null
          tipo?: Database["public"]["Enums"]["document_type"]
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          autor?: string | null
          conteudo?: Json
          cover_image?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_image?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["document_status"]
          subtitulo?: string | null
          tipo?: Database["public"]["Enums"]["document_type"]
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      families: {
        Row: {
          ai_enabled: boolean
          auto_share: boolean
          created_at: string
          created_by: string
          id: string
          invite_code: string
          nome: string
          plano: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          auto_share?: boolean
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          nome: string
          plano?: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          auto_share?: boolean
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          nome?: string
          plano?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_goals: {
        Row: {
          created_at: string
          created_by: string
          descricao: string | null
          family_id: string
          id: string
          nome: string
          prazo: string | null
          status: string
          updated_at: string
          valor_atual: number
          valor_objetivo: number
        }
        Insert: {
          created_at?: string
          created_by: string
          descricao?: string | null
          family_id: string
          id?: string
          nome: string
          prazo?: string | null
          status?: string
          updated_at?: string
          valor_atual?: number
          valor_objetivo?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          descricao?: string | null
          family_id?: string
          id?: string
          nome?: string
          prazo?: string | null
          status?: string
          updated_at?: string
          valor_atual?: number
          valor_objetivo?: number
        }
        Relationships: [
          {
            foreignKeyName: "family_goals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_insights: {
        Row: {
          conteudo: string
          created_at: string
          family_id: string
          id: string
          impacto_estimado: string | null
          tipo: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          family_id: string
          id?: string
          impacto_estimado?: string | null
          tipo?: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          family_id?: string
          id?: string
          impacto_estimado?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_insights_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          family_id: string
          id: string
          joined_at: string
          permissions: Json
          privacy_settings: Json
          role: string
          user_id: string
        }
        Insert: {
          family_id: string
          id?: string
          joined_at?: string
          permissions?: Json
          privacy_settings?: Json
          role?: string
          user_id: string
        }
        Update: {
          family_id?: string
          id?: string
          joined_at?: string
          permissions?: Json
          privacy_settings?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          category_id: string | null
          cdi_percentage: number
          color: string
          created_at: string
          custom_annual_rate: number | null
          family_id: string | null
          goal_type: string
          icon: string
          id: string
          initial_amount: number
          is_completed: boolean
          is_primary: boolean
          monthly_contribution: number
          notes: string | null
          piggy_bank_id: string | null
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          cdi_percentage?: number
          color?: string
          created_at?: string
          custom_annual_rate?: number | null
          family_id?: string | null
          goal_type?: string
          icon?: string
          id?: string
          initial_amount?: number
          is_completed?: boolean
          is_primary?: boolean
          monthly_contribution?: number
          notes?: string | null
          piggy_bank_id?: string | null
          target_amount: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          cdi_percentage?: number
          color?: string
          created_at?: string
          custom_annual_rate?: number | null
          family_id?: string | null
          goal_type?: string
          icon?: string
          id?: string
          initial_amount?: number
          is_completed?: boolean
          is_primary?: boolean
          monthly_contribution?: number
          notes?: string | null
          piggy_bank_id?: string | null
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_piggy_bank_id_fkey"
            columns: ["piggy_bank_id"]
            isOneToOne: false
            referencedRelation: "piggy_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          bank_detected: string | null
          created_at: string
          error_message: string | null
          expense_total: number
          family_id: string | null
          file_name: string
          file_type: string
          id: string
          income_total: number
          raw_summary: Json | null
          records_duplicated: number
          records_imported: number
          records_total: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_detected?: string | null
          created_at?: string
          error_message?: string | null
          expense_total?: number
          family_id?: string | null
          file_name: string
          file_type: string
          id?: string
          income_total?: number
          raw_summary?: Json | null
          records_duplicated?: number
          records_imported?: number
          records_total?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_detected?: string | null
          created_at?: string
          error_message?: string | null
          expense_total?: number
          family_id?: string | null
          file_name?: string
          file_type?: string
          id?: string
          income_total?: number
          raw_summary?: Json | null
          records_duplicated?: number
          records_imported?: number
          records_total?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_rules: {
        Row: {
          category_id: string | null
          created_at: string
          hits: number
          id: string
          match_type: string
          pattern: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          hits?: number
          id?: string
          match_type?: string
          pattern: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          hits?: number
          id?: string
          match_type?: string
          pattern?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_transactions_map: {
        Row: {
          created_at: string
          external_hash: string
          id: string
          import_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          external_hash: string
          id?: string
          import_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          external_hash?: string
          id?: string
          import_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imported_transactions_map_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_transactions_map_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_items: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          impacts_balance: boolean
          installment_number: number
          is_paid: boolean
          paid_at: string | null
          purchase_id: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          impacts_balance?: boolean
          installment_number: number
          is_paid?: boolean
          paid_at?: string | null
          purchase_id: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          impacts_balance?: boolean
          installment_number?: number
          is_paid?: boolean
          paid_at?: string | null
          purchase_id?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "installment_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_purchases: {
        Row: {
          card_name: string | null
          category_id: string | null
          created_at: string
          family_id: string | null
          first_due_date: string
          id: string
          impacts_balance: boolean
          installments_count: number
          name: string
          notes: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          card_name?: string | null
          category_id?: string | null
          created_at?: string
          family_id?: string | null
          first_due_date: string
          id?: string
          impacts_balance?: boolean
          installments_count: number
          name: string
          notes?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          card_name?: string | null
          category_id?: string | null
          created_at?: string
          family_id?: string | null
          first_due_date?: string
          id?: string
          impacts_balance?: boolean
          installments_count?: number
          name?: string
          notes?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_purchases_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_purchases_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_assets: {
        Row: {
          created_at: string
          id: string
          name: string | null
          segment: string | null
          ticker: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          segment?: string | null
          ticker: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          segment?: string | null
          ticker?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_dividends: {
        Row: {
          amount: number
          asset_id: string
          com_date: string | null
          created_at: string
          id: string
          pay_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          com_date?: string | null
          created_at?: string
          id?: string
          pay_date: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          com_date?: string | null
          created_at?: string
          id?: string
          pay_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_dividends_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_transactions: {
        Row: {
          asset_id: string
          created_at: string
          date: string
          id: string
          kind: string
          notes: string | null
          quantity: number
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          date?: string
          id?: string
          kind: string
          notes?: string | null
          quantity: number
          total: number
          unit_price: number
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          date?: string
          id?: string
          kind?: string
          notes?: string | null
          quantity?: number
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "investment_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      market_quotes_cache: {
        Row: {
          com_date: string | null
          dividend_yield: number | null
          last_dividend: number | null
          liquidity: number | null
          name: string | null
          patrimonial_value: number | null
          pay_date: string | null
          price: number | null
          provider: string | null
          raw: Json | null
          segment: string | null
          ticker: string
          updated_at: string
        }
        Insert: {
          com_date?: string | null
          dividend_yield?: number | null
          last_dividend?: number | null
          liquidity?: number | null
          name?: string | null
          patrimonial_value?: number | null
          pay_date?: string | null
          price?: number | null
          provider?: string | null
          raw?: Json | null
          segment?: string | null
          ticker: string
          updated_at?: string
        }
        Update: {
          com_date?: string | null
          dividend_yield?: number | null
          last_dividend?: number | null
          liquidity?: number | null
          name?: string | null
          patrimonial_value?: number | null
          pay_date?: string | null
          price?: number | null
          provider?: string | null
          raw?: Json | null
          segment?: string | null
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          image_url: string | null
          key: string
          medal_type: string
          name: string
          rarity: string
          xp_reward: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          image_url?: string | null
          key: string
          medal_type?: string
          name: string
          rarity?: string
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          image_url?: string | null
          key?: string
          medal_type?: string
          name?: string
          rarity?: string
          xp_reward?: number
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          id: string
          message: string
          notification_level: number
          sent_at: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          message: string
          notification_level: number
          sent_at?: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          message?: string
          notification_level?: number
          sent_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          consumed_ip: string | null
          consumed_user_agent: string | null
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          ip: string | null
          token_hash: string
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consumed_ip?: string | null
          consumed_user_agent?: string | null
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          ip?: string | null
          token_hash: string
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consumed_ip?: string | null
          consumed_user_agent?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          ip?: string | null
          token_hash?: string
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          plan_code: string | null
          provider: string
          provider_payment_id: string | null
          provider_subscription_id: string | null
          raw: Json
          receipt_url: string | null
          status: string
          status_detail: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          plan_code?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          raw?: Json
          receipt_url?: string | null
          status?: string
          status_detail?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          plan_code?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_subscription_id?: string | null
          raw?: Json
          receipt_url?: string | null
          status?: string
          status_detail?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      piggy_bank: {
        Row: {
          balance: number
          cdi_rate_annual: number
          color: string
          created_at: string
          currency: string
          family_id: string | null
          icon: string
          id: string
          is_completed: boolean
          last_yield_calculation: string | null
          name: string
          principal_amount: number
          target_amount: number | null
          total_yield: number
          updated_at: string
          user_id: string
          yield_start_date: string | null
        }
        Insert: {
          balance?: number
          cdi_rate_annual?: number
          color?: string
          created_at?: string
          currency?: string
          family_id?: string | null
          icon?: string
          id?: string
          is_completed?: boolean
          last_yield_calculation?: string | null
          name?: string
          principal_amount?: number
          target_amount?: number | null
          total_yield?: number
          updated_at?: string
          user_id: string
          yield_start_date?: string | null
        }
        Update: {
          balance?: number
          cdi_rate_annual?: number
          color?: string
          created_at?: string
          currency?: string
          family_id?: string | null
          icon?: string
          id?: string
          is_completed?: boolean
          last_yield_calculation?: string | null
          name?: string
          principal_amount?: number
          target_amount?: number | null
          total_yield?: number
          updated_at?: string
          user_id?: string
          yield_start_date?: string | null
        }
        Relationships: []
      }
      piggy_bank_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          piggy_bank_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          piggy_bank_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          piggy_bank_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "piggy_bank_transactions_piggy_bank_id_fkey"
            columns: ["piggy_bank_id"]
            isOneToOne: false
            referencedRelation: "piggy_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      piggy_bank_yield_history: {
        Row: {
          cdi_rate_used: number
          created_at: string
          cumulative_yield: number
          daily_yield: number
          date: string
          id: string
          piggy_bank_id: string
          principal_at_date: number
          user_id: string
        }
        Insert: {
          cdi_rate_used: number
          created_at?: string
          cumulative_yield: number
          daily_yield: number
          date?: string
          id?: string
          piggy_bank_id: string
          principal_at_date: number
          user_id: string
        }
        Update: {
          cdi_rate_used?: number
          created_at?: string
          cumulative_yield?: number
          daily_yield?: number
          date?: string
          id?: string
          piggy_bank_id?: string
          principal_at_date?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "piggy_bank_yield_history_piggy_bank_id_fkey"
            columns: ["piggy_bank_id"]
            isOneToOne: false
            referencedRelation: "piggy_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_id: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_id: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_id?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_limits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          plan_id: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          plan_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          plan_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          color: string
          created_at: string
          family_id: string | null
          icon: string
          id: string
          name: string
          product_type: string
          stock_quantity: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          family_id?: string | null
          icon?: string
          id?: string
          name: string
          product_type?: string
          stock_quantity?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          family_id?: string | null
          icon?: string
          id?: string
          name?: string
          product_type?: string
          stock_quantity?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          email: string
          id: string
          name: string
          push_notifications_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          email: string
          id?: string
          name: string
          push_notifications_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          email?: string
          id?: string
          name?: string
          push_notifications_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          amount: number
          category_id: string | null
          color: string | null
          created_at: string
          day_of_month: number | null
          family_id: string | null
          frequency: string
          icon: string | null
          id: string
          is_active: boolean
          last_paid_at: string | null
          name: string
          next_due_date: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          color?: string | null
          created_at?: string
          day_of_month?: number | null
          family_id?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          last_paid_at?: string | null
          name: string
          next_due_date: string
          notes?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          color?: string | null
          created_at?: string
          day_of_month?: number | null
          family_id?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          last_paid_at?: string | null
          name?: string
          next_due_date?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_goals: {
        Row: {
          color: string
          created_at: string
          current_amount: number
          deadline: string | null
          icon: string
          id: string
          is_completed: boolean
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string
          id?: string
          is_completed?: boolean
          name: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string
          id?: string
          is_completed?: boolean
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shared_transactions: {
        Row: {
          created_at: string
          family_id: string
          id: string
          shared_by: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          shared_by: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          shared_by?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_output_items: {
        Row: {
          created_at: string
          id: string
          output_id: string
          produced_at: string | null
          product_id: string
          product_name: string
          product_type: string
          production_status: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          output_id: string
          produced_at?: string | null
          product_id: string
          product_name: string
          product_type?: string
          production_status?: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          output_id?: string
          produced_at?: string | null
          product_id?: string
          product_name?: string
          product_type?: string
          production_status?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_output_items_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "stock_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_output_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_outputs: {
        Row: {
          created_at: string
          description: string | null
          family_id: string | null
          id: string
          output_date: string
          output_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          output_date?: string
          output_type: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          family_id?: string | null
          id?: string
          output_date?: string
          output_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          plan_code: string | null
          source: string
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          plan_code?: string | null
          source?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          plan_code?: string | null
          source?: string
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          available_until: string | null
          billing_cycle: string
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_highlighted: boolean
          is_lifetime: boolean
          lifetime_price: number | null
          max_seats: number | null
          metadata: Json
          name: string
          price_monthly: number
          price_yearly: number | null
          seats_taken: number
          slug: string | null
          sort_order: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          available_until?: string | null
          billing_cycle?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          is_lifetime?: boolean
          lifetime_price?: number | null
          max_seats?: number | null
          metadata?: Json
          name: string
          price_monthly?: number
          price_yearly?: number | null
          seats_taken?: number
          slug?: string | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          available_until?: string | null
          billing_cycle?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_highlighted?: boolean
          is_lifetime?: boolean
          lifetime_price?: number | null
          max_seats?: number | null
          metadata?: Json
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          seats_taken?: number
          slug?: string | null
          sort_order?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      theme_audit_log: {
        Row: {
          action: string
          changes: Json
          created_at: string
          id: string
          theme_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json
          created_at?: string
          id?: string
          theme_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          id?: string
          theme_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_audit_log_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "theme_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_settings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          identity: Json
          is_active: boolean
          is_default: boolean
          is_preset: boolean
          layout: Json
          mode: string
          name: string
          tokens_dark: Json
          tokens_light: Json
          typography: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identity?: Json
          is_active?: boolean
          is_default?: boolean
          is_preset?: boolean
          layout?: Json
          mode?: string
          name: string
          tokens_dark?: Json
          tokens_light?: Json
          typography?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identity?: Json
          is_active?: boolean
          is_default?: boolean
          is_preset?: boolean
          layout?: Json
          mode?: string
          name?: string
          tokens_dark?: Json
          tokens_light?: Json
          typography?: Json
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          import_id: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          import_id?: string | null
          source?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          import_id?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "import_history"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          average_session_time: number
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          last_login_at: string | null
          missed_days_in_week: number
          status_usuario: string
          total_sessions: number
          total_time_online: number
          updated_at: string
          user_id: string
          week_cycle_start: string | null
        }
        Insert: {
          average_session_time?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          last_login_at?: string | null
          missed_days_in_week?: number
          status_usuario?: string
          total_sessions?: number
          total_time_online?: number
          updated_at?: string
          user_id: string
          week_cycle_start?: string | null
        }
        Update: {
          average_session_time?: number
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          last_login_at?: string | null
          missed_days_in_week?: number
          status_usuario?: string
          total_sessions?: number
          total_time_online?: number
          updated_at?: string
          user_id?: string
          week_cycle_start?: string | null
        }
        Relationships: []
      }
      user_gamification_notifications: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mission_history: {
        Row: {
          completed_at: string
          id: string
          mission_id: string
          shown_home: boolean
          shown_popup: boolean
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string
          id?: string
          mission_id: string
          shown_home?: boolean
          shown_popup?: boolean
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string
          id?: string
          mission_id?: string
          shown_home?: boolean
          shown_popup?: boolean
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_mission_history_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          animations: string
          created_at: string
          dashboard_layout: Json
          density: string
          labs: Json
          menu_layout: Json
          notifications: Json
          primary_color: string | null
          regional: Json
          theme_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          animations?: string
          created_at?: string
          dashboard_layout?: Json
          density?: string
          labs?: Json
          menu_layout?: Json
          notifications?: Json
          primary_color?: string | null
          regional?: Json
          theme_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          animations?: string
          created_at?: string
          dashboard_layout?: Json
          density?: string
          labs?: Json
          menu_layout?: Json
          notifications?: Json
          primary_color?: string | null
          regional?: Json
          theme_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          login_at: string
          logout_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          login_at?: string
          logout_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          login_at?: string
          logout_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount: number | null
          cancel_at_period_end: boolean
          cancelled_at: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          metadata: Json
          next_billing_at: string | null
          plan_code: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          started_at: string
          status: string
          trial: boolean
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          next_billing_at?: string | null
          plan_code?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          trial?: boolean
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json
          next_billing_at?: string | null
          plan_code?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: string
          trial?: boolean
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          id: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_days: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          plan_code: string
          updated_at: string
          uses_count: number
          views_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          plan_code: string
          updated_at?: string
          uses_count?: number
          views_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          plan_code?: string
          updated_at?: string
          uses_count?: number
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "vip_codes_plan_code_fkey"
            columns: ["plan_code"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["code"]
          },
        ]
      }
      vip_redemptions: {
        Row: {
          code: string
          expires_at: string | null
          id: string
          plan_code: string
          redeemed_at: string
          user_id: string
          vip_code_id: string
        }
        Insert: {
          code: string
          expires_at?: string | null
          id?: string
          plan_code: string
          redeemed_at?: string
          user_id: string
          vip_code_id: string
        }
        Update: {
          code?: string
          expires_at?: string | null
          id?: string
          plan_code?: string
          redeemed_at?: string
          user_id?: string
          vip_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_redemptions_vip_code_id_fkey"
            columns: ["vip_code_id"]
            isOneToOne: false
            referencedRelation: "vip_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_missions: {
        Row: {
          created_at: string
          current_value: number
          description: string
          expires_at: string
          icon: string
          id: string
          is_completed: boolean
          rarity: string
          target_type: string
          target_value: number
          title: string
          user_id: string
          week_start: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          current_value?: number
          description: string
          expires_at: string
          icon?: string
          id?: string
          is_completed?: boolean
          rarity?: string
          target_type: string
          target_value?: number
          title: string
          user_id: string
          week_start?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string
          expires_at?: string
          icon?: string
          id?: string
          is_completed?: boolean
          rarity?: string
          target_type?: string
          target_value?: number
          title?: string
          user_id?: string
          week_start?: string
          xp_reward?: number
        }
        Relationships: []
      }
    }
    Views: {
      credit_card_usage: {
        Row: {
          available_amount: number | null
          card_id: string | null
          credit_limit: number | null
          used_amount: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cc_ensure_invoice: {
        Args: { _card_id: string; _reference_month: string }
        Returns: string
      }
      cc_process_recurring: { Args: never; Returns: number }
      cc_reference_month: {
        Args: { _closing_day: number; _purchase_date: string }
        Returns: string
      }
      find_family_by_invite_code: { Args: { p_code: string }; Returns: string }
      get_family_invite_code: { Args: { _family_id: string }; Returns: string }
      get_plan_limit: {
        Args: { _key: string; _user_id: string }
        Returns: number
      }
      has_feature: {
        Args: { _slug: string; _user_id: string }
        Returns: boolean
      }
      user_plan_code: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      changelog_category:
        | "novidade"
        | "melhoria"
        | "correcao"
        | "seguranca"
        | "performance"
        | "premium"
        | "planejamento"
        | "investimentos"
        | "cartoes"
        | "ia"
      document_status: "published" | "draft" | "archived"
      document_type:
        | "policy"
        | "terms"
        | "cookies"
        | "about"
        | "changelog"
        | "custom"
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
    Enums: {
      app_role: ["admin", "user"],
      changelog_category: [
        "novidade",
        "melhoria",
        "correcao",
        "seguranca",
        "performance",
        "premium",
        "planejamento",
        "investimentos",
        "cartoes",
        "ia",
      ],
      document_status: ["published", "draft", "archived"],
      document_type: [
        "policy",
        "terms",
        "cookies",
        "about",
        "changelog",
        "custom",
      ],
    },
  },
} as const
