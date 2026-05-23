export type SceneId = string & { readonly __brand: "SceneId" };
export type ChoiceId = string & { readonly __brand: "ChoiceId" };

export type Choice = Readonly<{
  id: ChoiceId;
  label: string;
  nextSceneId: SceneId;
}>;

export type Scene = Readonly<{
  id: SceneId;
  title: string;
  body: string;
  choices: ReadonlyArray<Choice>;
  isEnding?: boolean;
}>;

export type Story = Readonly<{
  id: string;
  title: string;
  startSceneId: SceneId;
  scenes: Readonly<Record<string, Scene>>;
}>;

export type PlayerProgress = Readonly<{
  storyId: string;
  currentSceneId: SceneId;
  history: ReadonlyArray<SceneId>;
}>;
