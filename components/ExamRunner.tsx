import React, { useState } from 'react';
import { Question, QuestionType } from '../types';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Award, AlertCircle } from 'lucide-react';

interface ExamRunnerProps {
  questions: Question[];
  onExit: () => void;
  onComplete: (wrongQuestionIds: string[]) => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({ questions, onExit, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (option: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: option
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
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

  const handleSubmit = () => {
    // Removed browser confirmation dialog which can be unresponsive or blocked
    
    let correctCount = 0;
    const wrong: string[] = [];

    questions.forEach(q => {
      const userAnswer = answers[q.id];
      // Use helper to check match
      if (userAnswer && isMatch(userAnswer, q.correctAnswer)) {
        correctCount++;
      } else {
        wrong.push(q.id);
      }
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setWrongIds(wrong);
    setIsSubmitted(true);
    setCurrentIndex(0); // Go back to start to review
    
    // Notify parent to record mistakes
    onComplete(wrong);
    
    // Force scroll to top so user sees the score header
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!currentQuestion) return <div>Loading...</div>;

  const isMultipleChoice = currentQuestion.type === QuestionType.MultipleChoice || currentQuestion.type === QuestionType.TrueFalse;

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onExit} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
          &larr; 退出考试
        </button>
        <div className="font-bold text-slate-800 text-lg">全真模拟测试</div>
        {!isSubmitted ? (
             <div className="text-blue-600 font-medium text-sm">
                进行中: {currentIndex + 1} / {questions.length}
             </div>
        ) : (
            <div className="text-emerald-600 font-bold text-lg">
                得分: {score}分
            </div>
        )}
      </div>

      {isSubmitted && (
         <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up">
             <div>
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Award className="text-yellow-500" /> 考试结束
                 </h3>
                 <p className="text-slate-600 text-sm mt-1">
                     您答对了 {questions.length - wrongIds.length} 道题，共 {questions.length} 道。
                     <br/>错题已自动加入错题本。
                 </p>
             </div>
             <button 
                onClick={onExit}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
             >
                 返回首页
             </button>
         </div>
      )}

      {/* Main Question Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-100 p-8 md:p-12 overflow-y-auto">
        <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-full">
                {currentQuestion.type === 'multiple-choice' ? '选择题' : currentQuestion.type === 'true-false' ? '判断题' : '问答题'}
            </span>
            {isSubmitted && wrongIds.includes(currentQuestion.id) && (
                <span className="ml-2 text-red-500 text-xs font-bold flex items-center gap-1 inline-flex">
                    <XCircle size={14} /> 回答错误
                </span>
            )}
            {isSubmitted && !wrongIds.includes(currentQuestion.id) && (
                <span className="ml-2 text-emerald-500 text-xs font-bold flex items-center gap-1 inline-flex">
                    <CheckCircle2 size={14} /> 回答正确
                </span>
            )}
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed">
            {currentIndex + 1}. {currentQuestion.text}
        </h2>

        {/* Options */}
        {isMultipleChoice ? (
            <div className="space-y-3 max-w-xl">
                {currentQuestion.options?.map((option, idx) => {
                    const isSelected = answers[currentQuestion.id] === option;
                    const isCorrect = isMatch(currentQuestion.correctAnswer, option); // Changed order to (correct, option) or (option, correct) doesn't matter with symmetric logic but keeping consistent
                    
                    let className = "border-slate-200 hover:bg-slate-50";
                    if (isSubmitted) {
                        if (isCorrect) className = "border-emerald-500 bg-emerald-50 text-emerald-800";
                        else if (isSelected && !isCorrect) className = "border-red-500 bg-red-50 text-red-800";
                        else className = "border-slate-100 text-slate-400 opacity-50";
                    } else if (isSelected) {
                        className = "border-blue-500 bg-blue-50 ring-1 ring-blue-500";
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleOptionSelect(option)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 font-medium flex justify-between items-center ${className}`}
                        >
                            <span>{option}</span>
                            {isSubmitted && isCorrect && <CheckCircle2 className="text-emerald-500" size={18} />}
                            {isSubmitted && isSelected && !isCorrect && <XCircle className="text-red-500" size={18} />}
                        </button>
                    )
                })}
            </div>
        ) : (
            <div className="space-y-4">
                <textarea 
                    className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="请输入您的答案..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleOptionSelect(e.target.value)}
                    disabled={isSubmitted}
                />
                {isSubmitted && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="font-bold text-slate-700 text-sm mb-1">参考答案：</p>
                        <p className="text-slate-600">{currentQuestion.correctAnswer}</p>
                    </div>
                )}
            </div>
        )}
        
        {/* Explanation shown after submit */}
        {isSubmitted && (
             <div className="mt-8 pt-6 border-t border-slate-100">
                {isMultipleChoice && (
                    <div className="mb-4">
                        <span className="font-bold text-slate-700 mr-2">正确答案:</span>
                        <span className="font-bold text-emerald-600 text-lg">{currentQuestion.correctAnswer}</span>
                    </div>
                )}
                <p className="font-bold text-slate-700 mb-2">解析：</p>
                <p className="text-slate-600 leading-relaxed">{currentQuestion.explanation || "暂无解析"}</p>
             </div>
        )}
      </div>

      {/* Footer Nav */}
      <div className="h-20 flex items-center justify-between mt-6">
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentIndex === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
        >
            <ArrowLeft size={18} /> 上一题
        </button>

        {!isSubmitted ? (
            currentIndex === questions.length - 1 ? (
                <button 
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    <CheckCircle2 size={18} /> 提交试卷
                </button>
            ) : (
                <button 
                    onClick={handleNext}
                    className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                    下一题 <ArrowRight size={18} />
                </button>
            )
        ) : (
            <div className="flex gap-2">
                 <button 
                    onClick={handleNext}
                    disabled={currentIndex === questions.length - 1}
                    className={`px-6 py-2 border border-slate-200 rounded-lg font-medium transition-colors ${currentIndex === questions.length - 1 ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    下一题 <ArrowRight size={18} />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};