import React, { useState, useEffect } from 'react';
import { Question, AppMode } from './types';
import { Importer } from './components/Importer';
import { QuizRunner } from './components/QuizRunner';
import { ExamRunner } from './components/ExamRunner';
import { PlusCircle, Play, Trophy, Trash2, BrainCircuit, BookX, ClipboardList, AlertCircle, CheckCircle2, Shuffle } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'flashmaster_questions';

const App: React.FC = () => {
  return <AppContent />
}

const AppContent: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.Dashboard);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[]>([]);
  const [activeQuizTitle, setActiveQuizTitle] = useState("练习模式");

  // Computed question lists
  const mistakeQuestions = questions.filter(q => q.inMistakeBook && !q.mastered);
  const masteredQuestions = questions.filter(q => q.mastered);

  useEffect(() => {
    // Check for API Key presence (Environment variable)
    if (process.env.API_KEY) {
      setHasApiKey(true);
    }
    
    // Load local storage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setQuestions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load questions", e);
      }
    }
  }, []);

  const saveQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newQuestions));
  };

  const handleImport = (newQs: Question[]) => {
    const updated = [...questions, ...newQs];
    saveQuestions(updated);
    setMode(AppMode.Dashboard);
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定要删除这个问题吗？")) return;
    const updated = questions.filter(q => q.id !== id);
    saveQuestions(updated);
  };

  // Function kept for internal logic if needed, but button removed from UI
  const handleClearAll = () => {
    if (confirm("确定要清空所有题目吗？此操作无法撤销。")) {
      saveQuestions([]);
    }
  };

  const handleMasterQuestion = (id: string) => {
    // If mastered, remove from mistake book as well
    const updated = questions.map(q => q.id === id ? { ...q, mastered: true, inMistakeBook: false } : q);
    saveQuestions(updated);
  };

  const handleMistake = (id: string) => {
      // Add to mistake book
      const updated = questions.map(q => {
          if (q.id === id) {
              return { ...q, inMistakeBook: true, mastered: false };
          }
          return q;
      });
      saveQuestions(updated);
  };

  const startPractice = () => {
      setActiveQuizQuestions(questions);
      setActiveQuizTitle("顺序练习");
      setMode(AppMode.Quiz);
  };

  const startRandomPractice = () => {
      if (questions.length === 0) return;
      const count = Math.min(30, questions.length);
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      setActiveQuizQuestions(shuffled.slice(0, count));
      setActiveQuizTitle(`随机测试 (${count}题)`);
      setMode(AppMode.Quiz);
  };

  const startMistakeReview = () => {
      const mistakes = questions.filter(q => q.inMistakeBook && !q.mastered);
      setActiveQuizQuestions(mistakes);
      setActiveQuizTitle("错题复习");
      setMode(AppMode.Quiz);
  }

  const startMasteredReview = () => {
      setActiveQuizQuestions(masteredQuestions);
      setActiveQuizTitle("已掌握题目复习");
      setMode(AppMode.Quiz);
  }

  const startMockExam = () => {
      if (questions.length === 0) return;
      // Randomly select 30 questions
      const count = Math.min(30, questions.length);
      const shuffled = [...questions].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, count);
      
      setExamQuestions(selected);
      setMode(AppMode.MockExam);
  };

  const handleExamComplete = (wrongIds: string[]) => {
      // Add wrong questions to mistake book
      if (wrongIds.length === 0) return;

      const updated = questions.map(q => {
          if (wrongIds.includes(q.id)) {
              return { ...q, inMistakeBook: true, mastered: false };
          }
          return q;
      });
      saveQuestions(updated);
  };

  const masteredCount = masteredQuestions.length;
  const mistakeCount = mistakeQuestions.length;

  // --- Render Views ---

  const renderDashboard = () => {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
               <BrainCircuit className="text-blue-600" size={32} />
               FlashMaster AI 刷题神器
            </h1>
            <p className="text-slate-500 mt-2 flex items-center gap-2">
                由
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Google Gemini</span>
                驱动
            </p>
          </div>
          <div className="flex gap-3">
             {/* Clear button removed */}
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">题库总数</div>
            <div className="text-4xl font-bold text-slate-800">{questions.length}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors"
               onClick={() => { if(masteredCount > 0) setMode(AppMode.MasteredNotebook); }}
          >
             <div className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-2">已掌握</div>
             <div className="text-4xl font-bold text-emerald-500">{masteredCount}</div>
             <div className="text-xs text-slate-400 mt-2">{masteredCount > 0 ? '点击查看列表 >' : '暂无数据'}</div>
          </div>
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-red-200 transition-colors"
                onClick={() => { if(mistakeCount > 0) setMode(AppMode.MistakeNotebook); }}
           >
             <div className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2">
                 错题本 {mistakeCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
             </div>
             <div className="text-4xl font-bold text-red-500">{mistakeCount}</div>
             <div className="text-xs text-slate-400 mt-2">{mistakeCount > 0 ? '点击进入复习 >' : '暂无错题'}</div>
          </div>
          <div className="flex flex-col gap-2">
             <button 
                onClick={startPractice}
                disabled={questions.length === 0}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
             >
                <Play size={16} /> 顺序练习 (全部)
             </button>
             <button 
                onClick={startRandomPractice}
                disabled={questions.length === 0}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
             >
                <Shuffle size={16} /> 随机测试 (30题)
             </button>
              <button 
                onClick={startMockExam}
                disabled={questions.length === 0}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
             >
                <ClipboardList size={16} /> 全真模拟 (30题)
             </button>
          </div>
        </div>

        {/* Question List Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">题库预览</h2>
            <button 
              onClick={() => setMode(AppMode.Import)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <PlusCircle size={18} /> 添加 / 导入题目
            </button>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {questions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Trophy className="mx-auto mb-4 opacity-20" size={48} />
                <p>暂无题目。请导入题目或让 AI 帮您生成！</p>
              </div>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        q.type === 'multiple-choice' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {q.type === 'multiple-choice' ? '选择题' : '卡片'}
                      </span>
                      {q.mastered && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-600">
                          已掌握
                        </span>
                      )}
                      {q.inMistakeBook && !q.mastered && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-100 text-red-600">
                          错题
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 font-medium truncate">{q.text}</p>
                    <p className="text-slate-400 text-sm truncate w-full max-w-md">答案: {q.correctAnswer}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(q.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMistakeNotebook = () => {
      return (
          <div className="max-w-5xl mx-auto p-6 md:p-10 h-full flex flex-col">
              <header className="flex justify-between items-center mb-6">
                 <div>
                    <button onClick={() => setMode(AppMode.Dashboard)} className="text-slate-500 hover:text-slate-800 text-sm font-medium mb-2 block">
                        &larr; 返回仪表盘
                    </button>
                    <h1 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                        <BookX /> 错题本
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        共 {mistakeCount} 道待复习错题。答对并标记为“已掌握”后将从此处移除。
                    </p>
                 </div>
                 {mistakeCount > 0 && (
                     <button 
                        onClick={startMistakeReview}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                     >
                         <Play size={18} /> 开始复习错题
                     </button>
                 )}
              </header>

              <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                   {mistakeCount === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-400">
                           <CheckCircle2 size={64} className="text-emerald-100 mb-4" />
                           <p className="text-lg font-medium text-emerald-600">太棒了！</p>
                           <p>目前没有错题。</p>
                       </div>
                   ) : (
                       <div className="divide-y divide-slate-100 overflow-y-auto h-full">
                           {mistakeQuestions.map(q => (
                               <div key={q.id} className="p-4 hover:bg-slate-50">
                                   <div className="flex items-center gap-2 mb-1">
                                       <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-red-100 text-red-600">错题</span>
                                   </div>
                                   <p className="font-medium text-slate-800 mb-1">{q.text}</p>
                                   <p className="text-sm text-slate-500">正确答案: {q.correctAnswer}</p>
                               </div>
                           ))}
                       </div>
                   )}
              </div>
          </div>
      )
  }

  const renderMasteredNotebook = () => {
    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 h-full flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div>
                <button onClick={() => setMode(AppMode.Dashboard)} className="text-slate-500 hover:text-slate-800 text-sm font-medium mb-2 block">
                    &larr; 返回仪表盘
                </button>
                <h1 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                    <CheckCircle2 /> 已掌握题目
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    共 {masteredCount} 道已熟练掌握的题目。
                </p>
                </div>
                {masteredCount > 0 && (
                    <button 
                    onClick={startMasteredReview}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors flex items-center gap-2"
                    >
                        <Play size={18} /> 复习这些题目
                    </button>
                )}
            </header>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {masteredCount === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <Trophy size={64} className="text-slate-200 mb-4" />
                        <p>还没有已掌握的题目。</p>
                        <p className="text-sm mt-2">在练习中点击“标记为已熟练”即可添加。</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 overflow-y-auto h-full">
                        {masteredQuestions.map(q => (
                            <div key={q.id} className="p-4 hover:bg-slate-50">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-600">已掌握</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                        q.type === 'multiple-choice' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                    }`}>
                                        {q.type === 'multiple-choice' ? '选择题' : '卡片'}
                                    </span>
                                </div>
                                <p className="font-medium text-slate-800 mb-1">{q.text}</p>
                                <p className="text-sm text-slate-500">正确答案: {q.correctAnswer}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

  return (
    <div className="h-full bg-slate-50">
      {!hasApiKey && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 text-center text-sm font-medium border-b border-amber-200 flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            未检测到 API Key，AI 功能将无法使用。
        </div>
      )}

      {mode === AppMode.Dashboard && renderDashboard()}
      
      {mode === AppMode.MistakeNotebook && renderMistakeNotebook()}

      {mode === AppMode.MasteredNotebook && renderMasteredNotebook()}

      {mode === AppMode.Import && (
        <div className="h-full p-6 md:p-10 flex flex-col justify-center">
             <Importer 
                onImport={handleImport} 
                onCancel={() => setMode(AppMode.Dashboard)} 
             />
        </div>
      )}

      {mode === AppMode.Quiz && (
        <QuizRunner 
            questions={activeQuizQuestions}
            title={activeQuizTitle}
            onExit={() => setMode(AppMode.Dashboard)}
            onMasterQuestion={handleMasterQuestion}
            onMistake={handleMistake}
        />
      )}

      {mode === AppMode.MockExam && (
        <ExamRunner
            questions={examQuestions}
            onExit={() => setMode(AppMode.Dashboard)}
            onComplete={handleExamComplete}
        />
      )}
    </div>
  );
}

export default App;