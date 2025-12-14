import React, { useState, useEffect } from 'react';
import { Question, QuestionType } from '../types';
import { explainAnswer } from '../services/geminiService';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCcw, BrainCircuit, Check, X, Loader2, Award } from 'lucide-react';

interface QuizRunnerProps {
  questions: Question[];
  onExit: () => void;
  onMasterQuestion: (id: string) => void;
  onMistake?: (id: string) => void; // Added callback for mistakes
  title?: string;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ questions, onExit, onMasterQuestion, onMistake, title = "练习模式" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  
  const currentQuestion = questions[currentIndex];
  
  useEffect(() => {
    setIsFlipped(false);
    setSelectedOption(null);
    setIsEvaluated(false);
    setAiExplanation(null);
    setLoadingExplanation(false);
    // Scroll to top when changing questions
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
        onExit(); 
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (isEvaluated) return;
    setSelectedOption(option);
  };

  // Robust matching logic for Options containing prefixes like "A. ", "B. "
  const isMatch = (option: string, correctAnswer: string) => {
    if (!option || !correctAnswer) return false;
    const o = option.trim();
    const c = correctAnswer.trim();
    
    // 1. Exact match
    if (o === c) return true;
    if (o.toLowerCase() === c.toLowerCase()) return true;

    // Helper to extract prefix (A, B, C...)
    const getPrefix = (s: string) => {
        const m = s.match(/^([A-Za-z])[\.\、\s]/);
        return m ? m[1].toUpperCase() : null;
    };

    // Helper to extract content (remove A., B. etc)
    const getContent = (s: string) => {
        return s.replace(/^([A-Za-z0-9]+)[\.\、\s]+/, '').trim();
    }

    const oPrefix = getPrefix(o);
    const cPrefix = getPrefix(c);
    
    // 2. Match by Prefix (e.g. Option="A. Text", Correct="A")
    // If correct answer is just a single letter, check if option starts with it
    if (/^[A-Za-z]$/.test(c)) {
        if (oPrefix === c.toUpperCase()) return true;
    }
    // Vice versa (e.g. Correct="A. Text", Option="A") - less likely in this UI but good for robustness
    if (/^[A-Za-z]$/.test(o)) {
        if (cPrefix === o.toUpperCase()) return true;
    }

    // 3. Match by Content (e.g. Option="A. Apple", Correct="Apple")
    const oContent = getContent(o);
    const cContent = getContent(c);

    if (oContent && cContent && oContent.toLowerCase() === cContent.toLowerCase()) return true;

    return false;
  };

  const checkAnswer = () => {
    setIsEvaluated(true);
    if (!currentQuestion) return;

    const correct = selectedOption && isMatch(selectedOption, currentQuestion.correctAnswer);
    
    // If wrong, add to mistake book
    if (!correct && onMistake) {
        onMistake(currentQuestion.id);
    }
  };

  const requestAiExplanation = async () => {
    if (!currentQuestion) return;
    setLoadingExplanation(true);
    try {
        const expl = await explainAnswer(
            currentQuestion.text,
            selectedOption || "未作答",
            currentQuestion.correctAnswer
        );
        setAiExplanation(expl);
    } catch (e) {
        setAiExplanation("无法获取解析。");
    } finally {
        setLoadingExplanation(false);
    }
  };

  if (!currentQuestion) {
    return <div className="text-center p-10 text-slate-500">暂时没有题目。</div>;
  }

  const isMultipleChoice = currentQuestion.type === QuestionType.MultipleChoice || currentQuestion.type === QuestionType.TrueFalse;
  const isSelectedCorrect = selectedOption && isMatch(selectedOption, currentQuestion.correctAnswer);

  return (
    <div className="max-w-3xl mx-auto flex flex-col pb-10">
      {/* Header Progress */}
      <div className="flex items-center justify-between mb-6 px-4 pt-4 sticky top-0 bg-slate-50 z-20 pb-2">
        <button onClick={onExit} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
          &larr; 退出{title}
        </button>
        <div className="flex-1 mx-6 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300" 
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-slate-500 text-sm font-medium">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex flex-col justify-center px-4">
        <div className="relative w-full perspective-1000">
            {/* Question Card */}
            <div className={`w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-500 p-8 md:p-12 flex flex-col min-h-[400px]
                ${isFlipped && !isMultipleChoice ? 'rotate-y-180 opacity-0 absolute top-0 z-0 pointer-events-none' : 'relative z-10 opacity-100'}
            `}>
                <div className="mb-6 flex justify-between items-start">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-full">
                        {currentQuestion.type === 'multiple-choice' ? '选择题' : currentQuestion.type === 'true-false' ? '判断题' : '闪卡'}
                    </span>
                    {currentQuestion.mastered && (
                        <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold">
                            <CheckCircle2 size={14} /> 已掌握
                        </span>
                    )}
                     {currentQuestion.inMistakeBook && (
                        <span className="text-red-500 flex items-center gap-1 text-xs font-bold ml-2">
                            <XCircle size={14} /> 错题本
                        </span>
                    )}
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 leading-snug">
                    {currentQuestion.text}
                </h2>

                {/* Multiple Choice Options */}
                {isMultipleChoice && currentQuestion.options && (
                    <div className="space-y-3 w-full max-w-xl">
                        {currentQuestion.options.map((option, idx) => {
                            let stateClass = "border-slate-200 hover:border-blue-400 hover:bg-slate-50";
                            const isSelected = selectedOption === option;
                            const isCorrectOption = isMatch(option, currentQuestion.correctAnswer);
                            
                            if (isEvaluated) {
                                if (isCorrectOption) {
                                    stateClass = "border-emerald-500 bg-emerald-50 text-emerald-800";
                                } else if (isSelected && !isCorrectOption) {
                                    stateClass = "border-red-500 bg-red-50 text-red-800";
                                } else {
                                    stateClass = "border-slate-100 text-slate-400 opacity-60";
                                }
                            } else if (isSelected) {
                                stateClass = "border-blue-500 bg-blue-50 ring-1 ring-blue-500";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(option)}
                                    disabled={isEvaluated}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 font-medium ${stateClass}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span>{option}</span>
                                        {isEvaluated && isCorrectOption && <CheckCircle2 className="text-emerald-500" size={20}/>}
                                        {isEvaluated && isSelected && !isCorrectOption && <XCircle className="text-red-500" size={20}/>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                
                {/* Check Answer Button (MC Only) */}
                {isMultipleChoice && !isEvaluated && (
                    <div className="mt-8">
                         <button 
                            onClick={checkAnswer}
                            disabled={!selectedOption}
                            className={`w-full md:w-auto px-8 py-3 rounded-lg font-bold text-white transition-all 
                                ${selectedOption ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl translate-y-0' : 'bg-slate-300 cursor-not-allowed'}
                            `}
                        >
                            检查答案
                        </button>
                    </div>
                )}
                
                {/* Reveal Button (Flashcard Only) */}
                {!isMultipleChoice && (
                    <div className="mt-auto pt-8 flex justify-center">
                         <button 
                            onClick={() => setIsFlipped(true)}
                            className="text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-2 px-6 py-2 rounded-full hover:bg-blue-50 transition-colors"
                        >
                            查看答案 <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {/* Feedback / Explanation Area (MC) */}
                {isEvaluated && isMultipleChoice && (
                     <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 animate-fade-in">
                        <div className="mb-3 pb-3 border-b border-slate-200">
                             <span className="font-semibold text-slate-700 mr-2">正确答案:</span>
                             <span className="font-bold text-emerald-600 text-lg">{currentQuestion.correctAnswer}</span>
                        </div>
                        
                        {/* Static explanation if available */}
                        {currentQuestion.explanation && (
                            <div className="mb-4">
                                <p className="font-semibold text-slate-700 mb-1">答案解析：</p>
                                <p className="text-slate-600">{currentQuestion.explanation}</p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-3 mt-4">
                            {!aiExplanation && (
                                <button 
                                    onClick={requestAiExplanation}
                                    disabled={loadingExplanation}
                                    className={`text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border
                                        ${loadingExplanation ? 'bg-slate-100 text-slate-400 border-slate-200' : 
                                        'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}
                                    `}
                                >
                                    {loadingExplanation ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                                    {loadingExplanation ? "AI 正在思考..." : "询问 AI 详细解析"}
                                </button>
                            )}
                            
                            {/* NEW: Mark as Mastered Button for MC */}
                            <button 
                                onClick={() => { onMasterQuestion(currentQuestion.id); handleNext(); }}
                                className="text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            >
                                <Award size={16} />
                                太简单，标记为已熟练
                            </button>
                        </div>
                        
                        {aiExplanation && (
                            <div className="mt-3 text-sm p-4 bg-purple-50 text-purple-900 rounded-lg border border-purple-100 animate-slide-up">
                                <span className="font-bold block mb-2 flex items-center gap-1 border-b border-purple-200 pb-2"><BrainCircuit size={16}/> AI 深度解析：</span>
                                <div className="leading-relaxed whitespace-pre-wrap">{aiExplanation}</div>
                            </div>
                        )}
                     </div>
                )}
            </div>

            {/* Back of Card (Flashcard Only) */}
            {!isMultipleChoice && (
                 <div className={`absolute top-0 left-0 w-full h-full bg-slate-800 text-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 p-8 md:p-12 flex flex-col
                    ${isFlipped ? 'opacity-100 z-10 rotate-y-0' : 'opacity-0 -z-10 rotate-y-180 pointer-events-none'}
                `}>
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-4">正确答案</h3>
                    <div className="flex-1 flex items-center justify-center text-center">
                        <p className="text-2xl font-medium leading-relaxed">{currentQuestion.correctAnswer}</p>
                    </div>
                     {currentQuestion.explanation && (
                        <p className="text-slate-400 text-sm mt-4 text-center border-t border-slate-700 pt-4">
                            {currentQuestion.explanation}
                        </p>
                    )}
                    <div className="mt-8 flex justify-center gap-4">
                        <button 
                            onClick={() => { setIsFlipped(false); if(onMistake) onMistake(currentQuestion.id); }} 
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-bold transition-colors flex justify-center items-center gap-2"
                        >
                            <X size={20} /> 忘记了
                        </button>
                        <button 
                            onClick={() => { onMasterQuestion(currentQuestion.id); handleNext(); }}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-bold transition-colors flex justify-center items-center gap-2"
                        >
                            <Check size={20} /> 已掌握
                        </button>
                    </div>
                     <button 
                        onClick={() => setIsFlipped(false)}
                        className="absolute top-6 right-6 text-slate-400 hover:text-white"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-3 rounded-full border-2 transition-colors ${currentIndex === 0 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-600 hover:border-slate-800 hover:text-slate-900'}`}
        >
            <ArrowLeft size={24} />
        </button>

        {isEvaluated || isFlipped ? (
            <button 
                onClick={handleNext}
                className="px-8 py-3 bg-slate-900 text-white rounded-full font-bold shadow-lg hover:bg-black hover:scale-105 transition-all flex items-center gap-2"
            >
                {currentIndex === questions.length - 1 ? '完成' : '下一题'} <ArrowRight size={20} />
            </button>
        ) : (
             <div className="w-32 text-center text-slate-400 text-sm italic">
                {isMultipleChoice ? '请选择一个答案' : '翻转卡片继续'}
             </div>
        )}

         <button 
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className={`p-3 rounded-full border-2 transition-colors ${currentIndex === questions.length - 1 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-600 hover:border-slate-800 hover:text-slate-900'}`}
        >
            <ArrowRight size={24} />
        </button>
      </div>
    </div>
  );
};