import StoryList from "./_components/StoryList";
import styles from "./page.module.css";

const HomePage = () => {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>סיפור לכולם</h1>
        <p className={styles.subtitle}>
          סיפור שיתופי. כל אחד יכול להתחיל סיפור או להמשיך סיפור קיים.
        </p>
      </header>
      <StoryList />
    </main>
  );
};

export default HomePage;
