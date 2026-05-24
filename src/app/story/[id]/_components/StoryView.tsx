"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Sentence, Story } from "@/lib/supabase/types";

import styles from "./StoryView.module.css";

const POLL_INTERVAL_MS = 5000;

type StoryViewProps = {
  story: Story;
  initialSentences: Sentence[];
};

const StoryView = ({ story, initialSentences }: StoryViewProps) => {
  const supabase = useMemo(() => createClient(), []);
  const [sentences, setSentences] = useState<Sentence[]>(initialSentences);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  const mergeSentences = (incoming: Sentence[]) => {
    setSentences((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      for (const s of incoming) map.set(s.id, s);
      return Array.from(map.values()).sort((a, b) =>
        a.created_at < b.created_at ? -1 : 1,
      );
    });
  };

  const fetchSentences = async () => {
    const { data, error: fetchError } = await supabase
      .from("sentences")
      .select("*")
      .eq("story_id", story.id)
      .order("created_at", { ascending: true });
    if (fetchError) {
      if (isMounted.current) setError(fetchError.message);
      return;
    }
    if (isMounted.current && data) mergeSentences(data);
  };

  useEffect(() => {
    isMounted.current = true;

    const channel = supabase
      .channel(`story-${story.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sentences",
          filter: `story_id=eq.${story.id}`,
        },
        (payload) => mergeSentences([payload.new as Sentence]),
      )
      .subscribe();

    const interval = window.setInterval(fetchSentences, POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sentences]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setIsSending(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("sentences")
      .insert({ story_id: story.id, text });

    if (insertError) {
      setError(insertError.message);
      setIsSending(false);
      return;
    }

    setDraft("");
    setIsSending(false);
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← לכל הסיפורים
        </Link>
        <h1 className={styles.title}>{story.title}</h1>
      </header>

      <section className={styles.card}>
        <div ref={scrollRef} className={styles.thread}>
          {sentences.length === 0 ? (
            <p className={styles.empty}>עדיין אין משפטים בסיפור הזה.</p>
          ) : (
            sentences.map((sentence, index) => (
              <p key={sentence.id} className={styles.sentence}>
                <span className={styles.sentenceIndex}>{index + 1}.</span>{" "}
                {sentence.text}
              </p>
            ))
          )}
        </div>

        <form className={styles.composer} onSubmit={handleSend}>
          <textarea
            className={styles.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="המשיכו את הסיפור במשפט נוסף..."
            rows={3}
          />
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={!draft.trim() || isSending}
          >
            {isSending ? "שולח..." : "הוסיפו משפט"}
          </button>
        </form>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
};

export default StoryView;
