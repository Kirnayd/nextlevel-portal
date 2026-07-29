export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      answers: {
        Row: {
          id: string;
          question_id: string;
          admin_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          admin_id: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          admin_id?: string;
          message?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          is_pinned: boolean;
          is_published: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          is_pinned?: boolean;
          is_published?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          is_pinned?: boolean;
          is_published?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      announcement_reads: {
        Row: {
          id: string;
          user_id: string;
          announcement_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          announcement_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          announcement_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      announcement_images: {
        Row: {
          id: string;
          announcement_id: string;
          storage_path: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          announcement_id: string;
          storage_path: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          announcement_id?: string;
          storage_path?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      document_categories: {
        Row: {
          id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      document_subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          category_id: string;
          subcategory_id: string | null;
          title: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          subcategory_id?: string | null;
          title: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          subcategory_id?: string | null;
          title?: string;
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          size_bytes?: number;
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          category: Database["public"]["Enums"]["file_category"];
          storage_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: Database["public"]["Enums"]["file_category"];
          storage_path: string;
          original_filename: string;
          mime_type: string;
          size_bytes: number;
          uploaded_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: Database["public"]["Enums"]["file_category"];
          storage_path?: string;
          original_filename?: string;
          mime_type?: string;
          size_bytes?: number;
          uploaded_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      price_reads: {
        Row: {
          id: string;
          user_id: string;
          file_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      notification_events: {
        Row: {
          id: string;
          event_key: string;
          event_type: string;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_key: string;
          event_type: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_key?: string;
          event_type?: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "announcement" | "price" | "document" | "question_answer";
          title: string;
          body: string | null;
          url: string;
          entity_id: string | null;
          is_read: boolean;
          created_at: string;
          read_at: string | null;
          event_key: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "announcement" | "price" | "document" | "question_answer";
          title: string;
          body?: string | null;
          url: string;
          entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
          read_at?: string | null;
          event_key?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "announcement" | "price" | "document" | "question_answer";
          title?: string;
          body?: string | null;
          url?: string;
          entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
          read_at?: string | null;
          event_key?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
        };
        Relationships: [];
      };
      question_answer_reads: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          read_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          read_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          message: string;
          status: Database["public"]["Enums"]["question_status"];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          message: string;
          status?: Database["public"]["Enums"]["question_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          message?: string;
          status?: Database["public"]["Enums"]["question_status"];
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      count_unread_announcements: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      count_unread_price: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      count_unread_question_answers: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      file_category: "price";
      question_status: "new" | "progress" | "answered";
      user_role: "admin" | "employee";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
    ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      file_category: ["price"],
      question_status: ["new", "progress", "answered"],
      user_role: ["admin", "employee"],
    },
  },
} as const;
