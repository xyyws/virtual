import { Question, QuestionType } from "../types";
import { GoogleGenAI } from "@google/genai";

const getApiKey = (): string | undefined => {
  return process.env.API_KEY;
};

// Helper to clean JSON string
const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  const pattern = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = text.match(pattern);
  return match && match[1] ? match[1] : text;
};

const callGemini = async (messages: any[], jsonMode: boolean) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key 未配置。请确保环境变量 API_KEY 已设置。");

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Extract system and user messages from the OpenAI-style array structure
    const systemMessage = messages.find((m: any) => m.role === 'system')?.content;
    const userMessage = messages.find((m: any) => m.role === 'user')?.content;

    if (!userMessage) throw new Error("User message is missing");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: systemMessage,
        responseMimeType: jsonMode ? 'application/json' : 'text/plain',
        temperature: jsonMode ? 0.2 : 0.7, // Lower temperature for JSON structural stability
      }
    });

    const text = response.text;
    if (!text) throw new Error("Gemini returned empty response");
    
    return text;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message?.includes("401") || error.toString().includes("API key")) {
       throw new Error("Google API Key 无效。请检查您的 API Key 是否正确 (需要 Google AI Studio Key)。");
    }
    
    if (error.message?.includes("429")) {
        throw new Error("请求过于频繁 (429)。您可能达到了 Gemini 免费层级的限制，请稍后重试。");
    }

    throw new Error(`Gemini 请求失败: ${error.message}`);
  }
};

// --- Public Methods ---

export const generateQuestionsFromTopic = async (topic: string, count: number = 5): Promise<Question[]> => {
  const systemPrompt = `你是一位专业的出题专家。请生成 ${count} 道关于用户指定主题的题目。
  返回格式必须是包含 "questions" 数组的 JSON 对象。
  
  题目对象结构：
  {
    "type": "multiple-choice" | "true-false" | "open-ended",
    "text": "题目描述",
    "options": ["A. 选项1", "B. 选项2"...],
    "correctAnswer": "正确选项文本",
    "explanation": "解析",
    "tags": ["标签"]
  }
  请确保内容严谨，使用中文输出。对于选择题，请保留选项的字母编号（如 A. B. C.）。`;

  const response = await callGemini([
    { role: "system", content: systemPrompt },
    { role: "user", content: `主题：${topic}` }
  ], true);

  try {
      const parsed = JSON.parse(cleanJsonString(response));
      const questions = parsed.questions || [];
      if (!Array.isArray(questions)) throw new Error("Missing questions array");

      return questions.map((q: any) => ({
        ...q,
        id: crypto.randomUUID(),
        mastered: false,
        inMistakeBook: false,
        options: q.type === QuestionType.OpenEnded ? [] : q.options
      }));
  } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("AI 返回格式有误，请重试。");
  }
};

export const parseRawTextToQuestions = async (rawText: string): Promise<Question[]> => {
  const systemPrompt = `你是一个智能数据解析器。请分析文本并提取测验题目。
  返回格式必须是包含 "questions" 数组的 JSON 对象。
  
  题目结构：
  {
    "type": "multiple-choice" | "true-false" | "open-ended",
    "text": "题目描述",
    "options": ["A. 选项1", "B. 选项2"...],
    "correctAnswer": "正确答案",
    "explanation": "解析",
    "tags": ["标签"]
  }
  
  重要规则：
  1. 如果原文中有选项编号（如 A. B. C. 或 1. 2. 3.），请务必在 "options" 数组中保留这些编号，不要去掉。
  2. "correctAnswer" 字段可以是选项的字母（如 "A"）或完整的选项文本。
  3. 使用中文输出。`;

  // Increased limit to 300,000 characters to support large documents.
  // Gemini 2.5 Flash has a massive context window so this is safe.
  const response = await callGemini([
    { role: "system", content: systemPrompt },
    { role: "user", content: `文本内容：\n${rawText.slice(0, 300000)}` }
  ], true);

  try {
      const parsed = JSON.parse(cleanJsonString(response));
      const questions = parsed.questions || [];
      if (!Array.isArray(questions)) throw new Error("Missing questions array");

      return questions.map((q: any) => ({
        ...q,
        id: crypto.randomUUID(),
        mastered: false,
        inMistakeBook: false,
        options: q.type === QuestionType.OpenEnded ? [] : q.options
      }));
  } catch (e) {
      console.error("JSON Parse Error", e);
      throw new Error("AI 解析失败，请确保文本内容清晰。");
  }
};

export const explainAnswer = async (question: string, userAnswer: string, correctAnswer: string): Promise<string> => {
  // Moderate length prompt (around 150 words)
  const systemPrompt = "你是一位专业的辅导老师。请用中文解释为什么用户的回答正确或错误。请控制长度在**150字左右**，做到言简意赅，不要长篇大论，直接点出核心逻辑和关键知识点。";
  const userPrompt = `题目：${question}\n用户回答：${userAnswer}\n正确答案：${correctAnswer}\n请给出适中长度的解析：`;
  
  try {
      const response = await callGemini([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ], false);
      return response || "暂无解析";
  } catch (e: any) {
      console.error("Explanation Error:", e);
      return `无法获取解析: ${e.message}`;
  }
};