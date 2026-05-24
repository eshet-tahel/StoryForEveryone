"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Story } from "@/lib/supabase/types";

import styles from "./StoryList.module.css";

const POLL_INTERVAL_MS = 5000;

const StoryList = () => {
  const supabase = useMemo(() => createClient(), []);
  const [stories, setStories] = useState<Story[]>([]);
  const [title, setTitle] = useState("");
  const [opening, setOpening] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const mergeStories = (incoming: Story[]) => {
    setStories((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      for (const s of incoming) map.set(s.id, s);
      return Array.from(map.values()).sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1,
      );
    });
  };

  const fetchStories = async () => {
    const { data, error: fetchError } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) {
      if (isMounted.current) setError(fetchError.message);
      return;
    }
    if (isMounted.current && data) mergeStories(data);
  };

  useEffect(() => {
    isMounted.current = true;
    fetchStories();

    const channel = supabase
      .channel("stories-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stories" },
        (payload) => mergeStories([payload.new as Story]),
      )
      .subscribe();

    const interval = window.setInterval(fetchStories, POLL_INTERVAL_MS);

    return () => {
      isMounted.current = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !opening.trim() || isCreating) return;
    setIsCreating(true);
    setError(null);

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .insert({ title: title.trim() })
      .select()
      .single();

    if (storyError || !story) {
      setError(storyError?.message ?? "נכשלה יצירת הסיפור");
      setIsCreating(false);
      return;
    }

    const { error: sentenceError } = await supabase
      .from("sentences")
      .insert({ story_id: story.id, text: opening.trim() });

    if (sentenceError) {
      setError(sentenceError.message);
      setIsCreating(false);
      return;
    }

    mergeStories([story]);
    setTitle("");
    setOpening("");
    setIsCreating(false);
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.createCard} onSubmit={handleCreate}>
        <h2 className={styles.cardTitle}>התחילו סיפור חדש</h2>
        <label className={styles.label}>
          שם הסיפור
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="לדוגמה: הרפתקה ביער הקסום"
            maxLength={120}
            required
          />
        </label>
        <label className={styles.label}>
          משפט הפתיחה
          <textarea
            className={styles.textarea}
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="היה היה פעם..."
            rows={3}
            required
          />
        </label>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={!title.trim() || !opening.trim() || isCreating}
        >
          {isCreating ? "יוצר..." : "צרו סיפור"}
        </button>
        {error ? <p className={styles.error}>{error}</p> : null}
      </form>

      <section className={styles.listSection}>
        <h2 className={styles.cardTitle}>סיפורים פעילים</h2>
        {stories.length === 0 ? (
          <p className={styles.empty}>עדיין אין סיפורים. היו הראשונים!</p>
        ) : (
          <ul className={styles.list}>
            {stories.map((story) => (
              <li key={story.id}>
                <Link
                  href={`/story/${story.id}` as Route}
                  className={styles.listItem}
                >
                  <span className={styles.itemTitle}>{story.title}</span>
                  <span className={styles.itemDate}>
                    {new Date(story.created_at).toLocaleString("he-IL")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default StoryList;
