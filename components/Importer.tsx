import React, { useState } from 'react';
import { Question, ImportResult } from '../types';
import { parseRawTextToQuestions, generateQuestionsFromTopic } from '../services/geminiService';
import { FileUp, FileJson, Sparkles, Loader2, BookOpen } from 'lucide-react';

interface ImporterProps {
  onImport: (questions: Question[]) => void;
  onCancel: () => void;
}

export const Importer: React.FC<ImporterProps> = ({ onImport, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'json' | 'ai-text' | 'ai-topic'>('json');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJsonImport = () => {
    try {
      setError(null);
      const parsed = JSON.parse(inputText);
      const questions = Array.isArray(parsed) ? parsed : [parsed];
      
      // Basic validation
      const validQuestions = questions.map((q: any) => ({
        ...q,
        id: q.id || crypto.randomUUID(),
        mastered: false,
        inMistakeBook: false,
        type: q.type || 'open-ended', // Default fallback
      }));

      onImport(validQuestions);
    } catch (e) {
      setError("JSON 格式无效，请检查语法。");
    }
  };

  const handleAiProcessing = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      let questions: Question[] = [];
      if (activeTab === 'ai-text') {
        questions = await parseRawTextToQuestions(inputText);
      } else {
        questions = await generateQuestionsFromTopic(inputText);
      }
      
      if (questions.length === 0) {
        setError("AI 无法生成任何题目，请尝试不同的输入。");
      } else {
        onImport(questions);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "发生了未知错误。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-slate-100 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">导入题目</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700">
          关闭
        </button>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-slate-100 pb-1">
        <button
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'json' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileJson size={16} /> JSON 导入
        </button>
        <button
          onClick={() => setActiveTab('ai-text')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'ai-text' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileUp size={16} /> AI 解析文本
        </button>
        <button
          onClick={() => setActiveTab('ai-topic')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'ai-topic' ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles size={16} /> AI 生成题目
        </button>
      </div>

      <div className="mb-6">
        {activeTab === 'json' && (
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">在此处粘贴 JSON 数组或上传文件。</p>
                <label className="cursor-pointer px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-md transition-colors">
                    上传 .json
                    <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
                </label>
             </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='[{"question": "...", "correctAnswer": "..."}]'
              className="w-full h-64 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>
        )}

        {activeTab === 'ai-text' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">在此处粘贴笔记、文章或文档内容。AI 助手将自动提取其中的题目。</p>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在此处粘贴原始内容..."
              className="w-full h-64 p-4 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>
        )}

        {activeTab === 'ai-topic' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100 flex flex-col items-center text-center">
                <BookOpen className="w-12 h-12 text-emerald-500 mb-3" />
                <h3 className="text-lg font-semibold text-emerald-800 mb-2">主题生成</h3>
                <p className="text-emerald-600 text-sm mb-4">输入一个主题（例如：“React Hooks”、“光合作用”、“二战历史”），AI 将为您生成一套学习题。</p>
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="输入主题..."
                    className="w-full max-w-sm px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAiProcessing()}
                />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
            <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={activeTab === 'json' ? handleJsonImport : handleAiProcessing}
          disabled={isLoading || !inputText.trim()}
          className={`px-6 py-2 rounded-lg font-medium text-white shadow-sm flex items-center gap-2 transition-all
            ${isLoading || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
            ${activeTab === 'json' ? 'bg-blue-600 hover:bg-blue-700' : 
              activeTab === 'ai-text' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-emerald-600 hover:bg-emerald-700'}
          `}
        >
          {isLoading && <Loader2 className="animate-spin" size={18} />}
          {activeTab === 'json' ? '导入 JSON' : activeTab === 'ai-text' ? '解析并导入' : '生成题目'}
        </button>
      </div>
    </div>
  );
};
