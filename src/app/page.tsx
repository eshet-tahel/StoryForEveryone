import { createClient } from "@/lib/supabase/server";

import styles from "./page.module.css";

const HomePage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Story For Everyone</h1>
      <p className={styles.subtitle}>
        משחק סיפור אינטראקטיבי למשפחה. בחר את הדמות שלך, צור את העלילה, וגלה
        איך הסיפור מתפתח.
      </p>
      <div className={styles.userBadge}>
        {user ? `שלום, ${user.email ?? "שחקן"}` : "אורח — עדיין לא מחובר"}
      </div>
    </main>
  );
};

export default HomePage;
