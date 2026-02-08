
import React, { useState } from 'react';
import GeneratorForm from './components/GeneratorForm';
import StoryDisplay from './components/StoryDisplay';
import { generateStoryStream } from './services/geminiService';
import { StoryParams, GeneratedStory } from './types';
import { Feather, AlertCircle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (params: StoryParams) => {
    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    
    setCurrentStory({ 
      title: 'ဖန်တီးနေဆဲ...', 
      content: '', 
      genre: params.genre,
      voiceName: params.voiceName
    });
    
    let fullText = '';
    
    try {
      const stream = generateStoryStream(params);
      
      for await (const chunk of stream) {
        if (!chunk) continue;
        if (!isStreaming) setIsStreaming(true);
        fullText += chunk;
        
        const lines = fullText.split('\n').filter(l => l.trim() !== '');
        let title = 'ဇာတ်လမ်းခေါင်းစဉ်';
        let content = fullText;

        if (lines.length > 0) {
          title = lines[0].replace(/^(ဇာတ်လမ်းခေါင်းစဉ်|ခေါင်းစဉ်|Title|ဝတ္ထုခေါင်းစဉ်)[:\-\s]*/i, '').trim();
          content = lines.slice(1).join('\n').trim();
          if (!content && fullText.length > title.length) {
            content = fullText;
          }
        }
        
        setCurrentStory(prev => ({
          ...prev!,
          title: title || 'ဇာတ်လမ်းခေါင်းစဉ်',
          content: content || fullText,
        }));
      }
    } catch (err: any) {
      console.error("Application Error Details:", err);
      setError(err.message || 'မမျှော်လင့်ထားသော အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်။ ကျေးဇူးပြု၍ ပြန်လည်ကြိုးစားပေးပါ။');
      setCurrentStory(null);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setCurrentStory(null);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handlePosterGenerated = (url: string) => {
    setCurrentStory(prev => prev ? ({ ...prev, imageUrl: url }) : null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-16 flex items-center shadow-sm sticky top-0 z-50 px-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:bg-indigo-700 transition-colors">
              <Feather className="text-white w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-800">
              Myanmar AI Novelist
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-12">
        {error && (
          <div className="mb-6 p-4 sm:p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 sm:gap-4 text-red-700 animate-in fade-in slide-in-from-top-4 shadow-sm">
            <div className="bg-red-100 p-2 rounded-full shrink-0">
              <AlertCircle size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="font-bold text-base sm:text-lg">အမှားတစ်ခု ရှိနေပါသည်</p>
              <p className="text-xs sm:text-base mt-1 leading-relaxed opacity-90">{error}</p>
              <button 
                onClick={handleReset}
                className="mt-3 text-xs sm:text-sm font-bold underline hover:text-red-900 transition-colors"
              >
                မူလစာမျက်နှာသို့ ပြန်သွားမည်
              </button>
            </div>
          </div>
        )}

        {!currentStory && !isLoading ? (
          <div key="generator-form" className="space-y-8 sm:space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight px-2">
                စိတ်ကူးထဲက <span className="text-indigo-600">ဇာတ်လမ်းများကို</span> <br className="hidden sm:block" />
                အကောင်အထည်ဖော်ပါ
              </h1>
              <p className="text-slate-500 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
                မြန်မာ AI စာရေးဆရာမှ သင့်အတွက် အကောင်းဆုံး ဇာတ်ကွက်နှင့် ဇာတ်ကောင်များကို ဖန်တီးပေးပါမည်။
              </p>
            </div>
            <GeneratorForm onSubmit={handleGenerate} isLoading={isLoading} />
          </div>
        ) : (
          <div key="story-display" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {currentStory && (
              <StoryDisplay 
                story={currentStory} 
                onReset={handleReset} 
                isGenerating={isLoading} 
                onPosterGenerated={handlePosterGenerated}
              />
            )}
          </div>
        )}
      </main>

      {isStreaming && isLoading && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full shadow-2xl flex items-center gap-3 sm:gap-4 z-50 animate-in slide-in-from-bottom-12">
          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 animate-spin" />
          <span className="text-xs sm:text-sm font-bold text-slate-700">AI စာရေးဆရာက ရေးသားနေပါသည်...</span>
        </div>
      )}
    </div>
  );
};

export default App;
