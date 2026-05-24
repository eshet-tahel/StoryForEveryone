export type Database = {
  public: {
    Tables: {
      stories: {
        Row: {
          id: string;
          title: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sentences: {
        Row: {
          id: string;
          story_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          text?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sentences_story_id_fkey";
            columns: ["story_id"];
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Story = Database["public"]["Tables"]["stories"]["Row"];
export type Sentence = Database["public"]["Tables"]["sentences"]["Row"];
