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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      app_theme_settings: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          settings: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          settings?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          settings?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_interactions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          details: string | null
          id: string
          interaction_date: string
          summary: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          interaction_date?: string
          summary: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          interaction_date?: string
          summary?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          lead_id: string | null
          name: string
          notes: string | null
          phone: string | null
          project_count: number
          satisfaction_rating: number | null
          source: string | null
          total_revenue: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          project_count?: number
          satisfaction_rating?: number | null
          source?: string | null
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_count?: number
          satisfaction_rating?: number | null
          source?: string | null
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          company_website: string | null
          created_at: string
          id: string
          license_rbq: string | null
          logo_url: string | null
          tax_tps: string | null
          tax_tvq: string | null
          updated_at: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          license_rbq?: string | null
          logo_url?: string | null
          tax_tps?: string | null
          tax_tvq?: string | null
          updated_at?: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_website?: string | null
          created_at?: string
          id?: string
          license_rbq?: string | null
          logo_url?: string | null
          tax_tps?: string | null
          tax_tvq?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_sequence_steps: {
        Row: {
          created_at: string
          delay_hours: number
          id: string
          label: string
          sequence_id: string
          step_order: number
          template_body: string
          template_name: string
          type: string
        }
        Insert: {
          created_at?: string
          delay_hours: number
          id?: string
          label: string
          sequence_id: string
          step_order: number
          template_body: string
          template_name: string
          type: string
        }
        Update: {
          created_at?: string
          delay_hours?: number
          id?: string
          label?: string
          sequence_id?: string
          step_order?: number
          template_body?: string
          template_name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_sequences: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      follow_up_step_statuses: {
        Row: {
          client_reply_channel: string | null
          client_reply_message: string | null
          client_reply_received_at: string | null
          created_at: string
          executed_at: string | null
          follow_up_id: string
          id: string
          scheduled_at: string
          status: string
          step_id: string
          updated_at: string
        }
        Insert: {
          client_reply_channel?: string | null
          client_reply_message?: string | null
          client_reply_received_at?: string | null
          created_at?: string
          executed_at?: string | null
          follow_up_id: string
          id?: string
          scheduled_at: string
          status?: string
          step_id: string
          updated_at?: string
        }
        Update: {
          client_reply_channel?: string | null
          client_reply_message?: string | null
          client_reply_received_at?: string | null
          created_at?: string
          executed_at?: string | null
          follow_up_id?: string
          id?: string
          scheduled_at?: string
          status?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_step_statuses_follow_up_id_fkey"
            columns: ["follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_step_statuses_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          quote_value: number
          sequence_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          quote_value?: number
          sequence_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          quote_value?: number
          sequence_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "follow_up_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          brand: string | null
          category: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          finish: string | null
          id: string
          image_url: string | null
          min_stock: number
          name: string
          quantity: number
          sds_url: string | null
          selling_price: number | null
          sku: string | null
          supplier: string | null
          supplier_price: number | null
          tds_url: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          finish?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number
          name: string
          quantity?: number
          sds_url?: string | null
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          supplier_price?: number | null
          tds_url?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          finish?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number
          name?: string
          quantity?: number
          sds_url?: string | null
          selling_price?: number | null
          sku?: string | null
          supplier?: string | null
          supplier_price?: number | null
          tds_url?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_requests: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          item_name: string
          notes: string | null
          priority: string
          quantity: number | null
          requested_by: string | null
          resolved_at: string | null
          status: string
          team_member_id: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_name: string
          notes?: string | null
          priority?: string
          quantity?: number | null
          requested_by?: string | null
          resolved_at?: string | null
          status?: string
          team_member_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_name?: string
          notes?: string | null
          priority?: string
          quantity?: number | null
          requested_by?: string | null
          resolved_at?: string | null
          status?: string
          team_member_id?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_requests_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_requests_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          budget: number
          created_at: string
          created_by: string | null
          email: string
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          project_type: string
          score: number
          source: string
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          address?: string | null
          budget?: number
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          project_type: string
          score?: number
          source: string
          status?: string
          updated_at?: string
          urgency: string
        }
        Update: {
          address?: string | null
          budget?: number
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_type?: string
          score?: number
          source?: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_deals: {
        Row: {
          created_at: string
          created_by: string | null
          expected_close: string | null
          id: string
          lead_id: string
          name: string
          probability: number
          project_type: string
          stage: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_close?: string | null
          id?: string
          lead_id: string
          name: string
          probability?: number
          project_type: string
          stage?: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_close?: string | null
          id?: string
          lead_id?: string
          name?: string
          probability?: number
          project_type?: string
          stage?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      project_materials: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          project_id: string
          quantity_needed: number
          quantity_used: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          project_id: string
          quantity_needed?: number
          quantity_used?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          project_id?: string
          quantity_needed?: number
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_materials_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          audio_url: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          project_id: string
          transcription: string | null
          type: string
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          project_id: string
          transcription?: string | null
          type?: string
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          project_id?: string
          transcription?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_photos: {
        Row: {
          caption: string | null
          category: string
          created_at: string
          id: string
          image_url: string
          project_id: string
          taken_at: string | null
        }
        Insert: {
          caption?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url: string
          project_id: string
          taken_at?: string | null
        }
        Update: {
          caption?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          project_id?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          budget: number
          client_name: string
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          end_date: string | null
          id: string
          latitude: number | null
          lead_id: string | null
          longitude: number | null
          name: string
          spent: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          budget?: number
          client_name: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          latitude?: number | null
          lead_id?: string | null
          longitude?: number | null
          name: string
          spent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          budget?: number
          client_name?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          latitude?: number | null
          lead_id?: string | null
          longitude?: number | null
          name?: string
          spent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_records: {
        Row: {
          address: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          out_of_zone: boolean | null
          project_id: string | null
          punch_type: string
          punched_at: string
          team_member_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          out_of_zone?: boolean | null
          project_id?: string | null
          punch_type: string
          punched_at?: string
          team_member_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          out_of_zone?: boolean | null
          project_id?: string | null
          punch_type?: string
          punched_at?: string
          team_member_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punch_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_records_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_records_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_address: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          labor_cost: number
          lead_id: string | null
          line_items: Json
          margin_percent: number
          material_cost: number
          notes: string | null
          profit: number
          project_description: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          template_type: string
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_address?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          labor_cost?: number
          lead_id?: string | null
          line_items?: Json
          margin_percent?: number
          material_cost?: number
          notes?: string | null
          profit?: number
          project_description?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          template_type?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_address?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          labor_cost?: number
          lead_id?: string | null
          line_items?: Json
          margin_percent?: number
          material_cost?: number
          notes?: string | null
          profit?: number
          project_description?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          template_type?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          address: string | null
          color: string | null
          created_at: string
          created_by: string | null
          crew_members: string[] | null
          deal_id: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          lead_id: string | null
          start_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          crew_members?: string[] | null
          deal_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          lead_id?: string | null
          start_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          crew_members?: string[] | null
          deal_id?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          start_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "pipeline_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_assignments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          das_percent: number
          email: string | null
          hourly_rate: number
          id: string
          name: string
          phone: string | null
          rate_ccq_commercial: number
          rate_ccq_residential_heavy: number
          rate_ccq_residential_light: number
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          das_percent?: number
          email?: string | null
          hourly_rate?: number
          id?: string
          name: string
          phone?: string | null
          rate_ccq_commercial?: number
          rate_ccq_residential_heavy?: number
          rate_ccq_residential_light?: number
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          das_percent?: number
          email?: string | null
          hourly_rate?: number
          id?: string
          name?: string
          phone?: string | null
          rate_ccq_commercial?: number
          rate_ccq_residential_heavy?: number
          rate_ccq_residential_light?: number
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          hourly_rate: number
          hours: number
          id: string
          project_id: string
          team_member_id: string | null
          total_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          hourly_rate?: number
          hours?: number
          id?: string
          project_id: string
          team_member_id?: string | null
          total_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          hourly_rate?: number
          hours?: number
          id?: string
          project_id?: string
          team_member_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_assignments: {
        Row: {
          assigned_date: string
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          notes: string | null
          returned_date: string | null
          status: string
          team_member_id: string
        }
        Insert: {
          assigned_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          notes?: string | null
          returned_date?: string | null
          status?: string
          team_member_id: string
        }
        Update: {
          assigned_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          notes?: string | null
          returned_date?: string | null
          status?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_assignments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      work_order_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          photo_type: string
          work_order_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          photo_type?: string
          work_order_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          photo_type?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_order_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_reports: {
        Row: {
          break_minutes: number | null
          break_notes: string | null
          created_at: string
          description: string | null
          disposable_materials_used: Json | null
          id: string
          job_completed: boolean | null
          paint_usage: Json | null
          project_id: string | null
          report_date: string
          schedule_event_id: string | null
          submitted_at: string | null
          team_member_id: string
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          break_notes?: string | null
          created_at?: string
          description?: string | null
          disposable_materials_used?: Json | null
          id?: string
          job_completed?: boolean | null
          paint_usage?: Json | null
          project_id?: string | null
          report_date?: string
          schedule_event_id?: string | null
          submitted_at?: string | null
          team_member_id: string
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          break_notes?: string | null
          created_at?: string
          description?: string | null
          disposable_materials_used?: Json | null
          id?: string
          job_completed?: boolean | null
          paint_usage?: Json | null
          project_id?: string | null
          report_date?: string
          schedule_event_id?: string | null
          submitted_at?: string | null
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_reports_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_members_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          name: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "employee" | "manager"
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
      app_role: ["admin", "employee", "manager"],
    },
  },
} as const
