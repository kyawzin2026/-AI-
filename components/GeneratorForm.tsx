
import React, { useState } from 'react';
import { Genre, Length, StoryParams } from '../types';
import { GENRE_LABELS, LENGTH_LABELS, SAMPLE_PROMPTS, VOICE_OPTIONS } from '../constants';
import { 
  Loader2, 
  PenTool, 
  Sparkles, 
  Heart, 
  Wand2, 
  Ghost, 
  History, 
  Rocket, 
  Scroll, 
  Theater,
  CheckCircle2,
  User,
  Volume2,
  Fingerprint
} from 'lucide-react';

interface GeneratorFormProps {
  onSubmit: (params: StoryParams) => void;
  isLoading: boolean;
}

const GENRE_ICONS: Record<Genre, React.ReactNode> = {
  [Genre.ROMANCE]: <Heart size={18} />,
  [Genre.FANTASY]: <Wand2 size={18} />,
  [Genre.THRILLER]: <Ghost size={18} />,
  [Genre.HISTORICAL]: <History size={18} />,
  [Genre.SCIFI]: <Rocket size={18} />,
  [Genre.FOLKLORE]: <Scroll size={18} />,
  [Genre.DRAMA]: <Theater size={18} />,
};

const GeneratorForm: React.FC<GeneratorFormProps> = ({ onSubmit, isLoading }) => {
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState<Genre>(Genre.ROMANCE);
  const [length, setLength] = useState<Length>(Length.SHORT);
  const [protagonist, setProtagonist] = useState('');
  const [protagonistBackground, setProtagonistBackground] = useState('');
  const [voiceName, setVoiceName] = useState(VOICE_OPTIONS[0].id);

  const getProtagonistPlaceholder = (selectedGenre: Genre) => {
    switch (selectedGenre) {
      case Genre.ROMANCE:
        return "ဥပမာ - ချစ်သူနှစ်ဦး သို့မဟုတ် မောင်မောင်နှင့်အေးအေး";
      case Genre.FANTASY:
        return "ဥပမာ - မှော်ဆရာ သို့မဟုတ် မင်းသားလေး";
      case Genre.THRILLER:
        return "ဥပမာ - စုံထောက် သို့မဟုတ် လျှို့ဝှက်သည်းဖို ဇာတ်ကောင်";
      case Genre.HISTORICAL:
        return "ဥပမာ - ရှေးခေတ်သူရဲကောင်း သို့မဟုတ် ဘုရင်တစ်ပါး";
      case Genre.SCIFI:
        return "ဥပမာ - အာကာသယာဉ်မှူး သို့မဟုတ် စက်ရုပ်";
      case Genre.FOLKLORE:
        return "ဥပမာ - နတ်သမီး သို့မဟုတ် ဘီလူး";
      case Genre.DRAMA:
        return "ဥပမာ - ကျောင်းဆရာမ သို့မဟုတ် မိခင်တစ်ဦး";
      default:
        return "ဥပမာ - ဇာတ်ကောင်အမည်";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onSubmit({ 
      topic, 
      genre, 
      length, 
      protagonist, 
      protagonistBackground, 
      voiceName 
    });
  };

  const handleSampleClick = (sample: string) => {
    setTopic(sample);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-8 border border-gray-100">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="bg-indigo-100 p-2.5 sm:p-3 rounded-full shrink-0">
          <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">ဇာတ်လမ်းဖန်တီးရန်</h2>
          <p className="text-xs sm:text-sm text-gray-500">အချက်အလက်များကို ဖြည့်စွက်ပေးပါ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Genre Selection - Responsive Grid */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            ဝတ္ထုအမျိုးအစား (Genre)
          </label>
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {(Object.keys(GENRE_LABELS) as Genre[]).map((g) => {
              const isSelected = genre === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(g)}
                  className={`relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md translate-y-[-2px]'
                      : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-indigo-100 hover:bg-white hover:translate-y-[-2px] hover:shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 text-indigo-600 animate-in zoom-in duration-300">
                      <CheckCircle2 size={14} fill="currentColor" className="text-white" />
                    </div>
                  )}
                  <div className={`mb-1.5 transition-all duration-300 transform ${
                    isSelected 
                      ? 'text-indigo-600 scale-125 rotate-6' 
                      : 'text-gray-400 group-hover:text-indigo-400 group-hover:scale-110 group-hover:rotate-3'
                  }`}>
                    {GENRE_ICONS[g]}
                  </div>
                  <span className={`text-[11px] sm:text-xs font-bold text-center leading-tight transition-colors duration-300 ${
                    isSelected ? 'text-indigo-900' : 'text-gray-600 group-hover:text-indigo-600'
                  }`}>
                    {GENRE_LABELS[g].split(' (')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8">
          {/* Length Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5">
              စာလုံးရေ (Length)
            </label>
            <div className="flex items-center h-12 sm:h-[54px] gap-1.5 bg-gray-50 p-1 rounded-2xl border border-gray-200">
              {(Object.keys(LENGTH_LABELS) as Length[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLength(l)}
                  className={`flex-1 h-full rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-200 ${
                    length === l
                      ? 'bg-white text-indigo-700 shadow-sm border border-gray-100'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {LENGTH_LABELS[l].split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Protagonist */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              အဓိကဇာတ်ကောင် (Protagonist)
            </label>
            <input
              type="text"
              value={protagonist}
              onChange={(e) => setProtagonist(e.target.value)}
              placeholder={getProtagonistPlaceholder(genre)}
              className="w-full h-12 sm:h-[54px] px-4 rounded-2xl border border-gray-200 bg-white text-gray-900 font-sans focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Protagonist Background (Optional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
            <Fingerprint size={16} className="text-gray-400" />
            ဇာတ်ကောင်၏ နောက်ခံနှင့် ရည်မှန်းချက်များ (Character Background & Motivation - Optional)
          </label>
          <textarea
            value={protagonistBackground}
            onChange={(e) => setProtagonistBackground(e.target.value)}
            placeholder="ဇာတ်ကောင်၏ စရိုက်၊ အတိတ်ကြောင်း သို့မဟုတ် ဖြစ်ချင်သော ဆန္ဒများကို ရေးသားနိုင်သည်..."
            rows={3}
            className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-900 font-sans leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none shadow-sm text-sm"
          />
        </div>

        {/* Voice Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Volume2 size={16} className="text-gray-400" />
            အသံရွေးချယ်ရန် (Narrator Voice)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {VOICE_OPTIONS.map((v) => {
              const isSelected = voiceName === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoiceName(v.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-indigo-100 hover:bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-full ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <Volume2 size={14} />
                  </div>
                  <span className={`text-xs font-bold text-left ${isSelected ? 'text-indigo-900' : 'text-gray-600'}`}>
                    {v.label}
                  </span>
                  {isSelected && <CheckCircle2 size={14} className="ml-auto text-indigo-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">
            ဇာတ်လမ်းအကြောင်းအရာ (Plot Idea)
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="ရေးသားလိုသော ဇာတ်လမ်းအကျဉ်းကို ဤနေရာတွင် ရေးပါ..."
            rows={4}
            className="w-full p-4 rounded-2xl border border-gray-200 bg-white text-gray-900 font-sans leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none shadow-sm text-sm"
            required
          />
          <div className="mt-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-1">စမ်းသပ်ကြည့်ရန်</span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.slice(0, 6).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSampleClick(sample)}
                  className="text-[11px] bg-white hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-full transition-all border border-gray-200 hover:border-indigo-200 hover:shadow-sm"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          className={`w-full py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg sm:text-xl text-white transition-all shadow-lg ${
            isLoading || !topic.trim()
              ? 'bg-gray-200 cursor-not-allowed shadow-none text-gray-400'
              : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] hover:shadow-indigo-200'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>ရေးသားနေပါသည်...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>ဇာတ်လမ်းစတင်ရေးပါ</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default GeneratorForm;
