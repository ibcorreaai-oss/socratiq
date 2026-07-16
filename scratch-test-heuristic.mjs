import { generateQuest } from "./src/lib/llm.ts";

const content =
  "Photosynthesis is the process by which plants convert light energy into chemical energy. " +
  "Chlorophyll absorbs sunlight in the chloroplasts. Water and carbon dioxide are combined to " +
  "produce glucose and oxygen. The light-dependent reactions occur in the thylakoid membrane. " +
  "The Calvin cycle fixes carbon dioxide into organic molecules using ATP and NADPH.";

const q = await generateQuest(content, "Photosynthesis");
console.log("title:", q.title);
console.log("bossName:", q.bossName);
console.log("concepts:", JSON.stringify(q.concepts));
console.log("questionCount:", q.questions.length);
const badConcepts = q.questions.filter((qq) => !q.concepts.includes(qq.concept));
console.log("questions with concept NOT in concepts[] (should be 0):", badConcepts.length);
console.log("sample question:", JSON.stringify(q.questions[0], null, 2));
