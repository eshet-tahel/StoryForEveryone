import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import StoryView from "./_components/StoryView";

type StoryPageProps = {
  params: Promise<{ id: string }>;
};

const StoryPage = async ({ params }: StoryPageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!story) {
    notFound();
  }

  const { data: sentences } = await supabase
    .from("sentences")
    .select("*")
    .eq("story_id", id)
    .order("created_at", { ascending: true });

  return (
    <StoryView story={story} initialSentences={sentences ?? []} />
  );
};

export default StoryPage;
