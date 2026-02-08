import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneratedStory } from '../types';
import { GENRE_LABELS } from '../constants';
import * as lamejs from 'lamejs';
import { 
  Copy, 
  Download, 
  RefreshCw, 
  BookOpen, 
  Volume2, 
  Square, 
  Loader2, 
  Check, 
  Edit3, 
  Bold, 
  Italic, 
  Eye,
  Music,
  FileText,
  FileDown,
  Eraser,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Settings2,
  Maximize2,
  Palette,
  RotateCcw,
  XCircle
} from 'lucide-react';
import { generateSpeech, generatePoster } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface StoryDisplayProps {
  story: GeneratedStory;
  onReset: () => void;
  isGenerating?: boolean;
  onPosterGenerated: (url: string) => void;
}

/**
 * Robust polyfill for lamejs in an ESM environment.
 * lamejs is a legacy library that relies on global variables (MPEGMode, Lame, BitStream).
 */
const ensureLameGlobals = (lib: any) => {
  if (!lib) return;
  
  const target = window as any;
  
  // Determine the source of the library components
  const source = lib.default || lib;
  
  const components = ['MPEGMode', 'Lame', 'BitStream', 'Mp3Encoder', 'LameEncoder', 'VbrMode'];
  
  components.forEach(key => {
    if (source[key]) {
      target[key] = source[key];
    } 
    else if (source.default && source.default[key]) {
      target[key] = source.default[key];
    }
    else if (source.Lame && source.Lame[key]) {
      target[key] = source.Lame[key];
    }
  });

  if (!target.MPEGMode) {
    if (target.Lame && target.Lame.MPEGMode) target.MPEGMode = target.Lame.MPEGMode;
    else if (target.Mp3Encoder && target.Mp3Encoder.MPEGMode) target.MPEGMode = target.Mp3Encoder.MPEGMode;
  }
};

// Helper functions for raw PCM audio processing
function decode(base64: string) {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decoding failed", e);
    throw new Error("Base64 Decoding Error");
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const byteLength = data.byteLength;
  const sampleCount = Math.floor(byteLength / 2);
  const dataInt16 = new Int16Array(sampleCount);
  
  // Reconstruct 16-bit PCM samples from bytes
  for (let i = 0; i < sampleCount; i++) {
    const low = data[i * 2];
    const high = data[i * 2 + 1];
    let value = low | (high << 8);
    if (value > 32767) value -= 65536;
    dataInt16[i] = value;
  }

  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper to create an MP3 file from Int16 PCM data
function createMp3File(pcmData: Int16Array, sampleRate: number) {
  const lib = (lamejs as any).default || lamejs;
  ensureLameGlobals(lib);
  
  const target = window as any;
  const Mp3EncoderClass = target.Mp3Encoder;
  
  if (!Mp3EncoderClass) {
    throw new Error("Mp3Encoder class not found. lamejs failed to initialize.");
  }

  try {
    const mp3encoder = new Mp3EncoderClass(1, sampleRate, 128); 
    const mp3Data: Uint8Array[] = [];
    
    const sampleBlockSize = 1152;
    for (let i = 0; i < pcmData.length; i += sampleBlockSize) {
      const sampleChunk = pcmData.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
    
    return new Blob(mp3Data, { type: 'audio/mpeg' });
  } catch (err: any) {
    console.error("MP3 Encoding failed internal error:", err);
    throw new Error(`MP3 Encoding failed: ${err.message || 'Internal error'}`);
  }
}

const POSTER_STYLES = ["Cinematic", "Oil Painting", "Minimalist", "Dark & Gritty", "Burmese Art", "Vibrant Anime"];
const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const IMAGE_SIZES = ["1K", "2K", "4K"];

const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, onReset, isGenerating, onPosterGenerated }) => {
  const [isNarrating, setIsNarrating] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isAudioDownloading, setIsAudioDownloading] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [showPosterSettings, setShowPosterSettings] = useState(false);
  const [posterConfig, setPosterConfig] = useState({
    aspectRatio: "16:9",
    imageSize: "2K",
    style: "Cinematic"
  });
  
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(story.content);
  const [ttsError, setTtsError] = useState<string | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const storyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isGenerating) {
      setEditableContent(story.content);
    }
  }, [story.content, isGenerating]);
  
  const stopNarration = useCallback((resetProgress = true) => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsNarrating(false);
    if (resetProgress) {
      setCurrentTime(0);
      playbackOffsetRef.current = 0;
    }
  }, []);

  useEffect(() => {
    return () => stopNarration();
  }, [stopNarration]);

  const handleGeneratePoster = async () => {
    try {
      setIsImageGenerating(true);
      setShowPosterSettings(false);
      
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        alert("အရည်အသွေးမြင့် ရုပ်ပုံများဖန်တီးရန် သင်၏ကိုယ်ပိုင် Paid API Key ကို ရွေးချယ်ပေးရန် လိုအပ်ပါသည်။");
        await (window as any).aistudio.openSelectKey();
      }

      const imageUrl = await generatePoster(
        story.title, 
        editableContent, 
        story.genre,
        posterConfig.aspectRatio,
        posterConfig.imageSize,
        posterConfig.style
      );
      onPosterGenerated(imageUrl);
    } catch (error: any) {
      console.error("Poster gen failed:", error);
      const errorMsg = error.message || JSON.stringify(error);
      if (errorMsg.includes("RESELECT_KEY") || errorMsg.includes("403") || errorMsg.includes("permission")) {
        alert("Paid Billing ပါရှိသော Project မှ API Key ကို ပြန်လည်ရွေးချယ်ပေးပါ။");
        await (window as any).aistudio.openSelectKey();
      } else {
        alert("ရုပ်ပုံဖန်တီးရာတွင် အခက်အခဲရှိနေပါသည်။\n" + errorMsg);
      }
    } finally {
      setIsImageGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${story.title}\n\n${editableContent}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleDownloadTxt = () => {
    const timestamp = new Date().toLocaleDateString();
    const fileContent = `Title: ${story.title}\nGenre: ${GENRE_LABELS[story.genre as any] || story.genre}\nDate: ${timestamp}\n\n${editableContent}`;
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${story.title.substring(0, 30)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!storyRef.current) return;
    setIsPdfDownloading(true);
    try {
      const canvas = await html2canvas(storyRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${story.title.substring(0, 30)}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
      alert("PDF ဖန်တီး၍ မရပါ။");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const toggleNarration = async () => {
    if (isNarrating) {
      stopNarration(false);
      return;
    }

    if (audioBufferRef.current) {
      startPlayback();
      return;
    }

    try {
      setIsTtsLoading(true);
      setTtsError(null);
      const base64Audio = await generateSpeech(editableContent, story.voiceName, story.genre);
      const audioData = decode(base64Audio);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
      audioBufferRef.current = buffer;
      setDuration(buffer.duration);
      startPlayback();
    } catch (error: any) {
      const msg = error.message || "အသံဖန်တီး၍ မရပါ။";
      console.error("Narration failed:", error);
      setTtsError(msg);
      // Removed generic alert to favor UI error display
    } finally {
      setIsTtsLoading(false);
    }
  };

  const startPlayback = () => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    playbackStartTimeRef.current = audioContextRef.current.currentTime - playbackOffsetRef.current;
    source.start(0, playbackOffsetRef.current);
    source.onended = () => {
      if (audioContextRef.current && audioContextRef.current.currentTime - playbackStartTimeRef.current >= audioBufferRef.current!.duration) {
        stopNarration(true);
      }
    };
    audioSourceRef.current = source;
    setIsNarrating(true);
    updateProgress();
  };

  const updateProgress = () => {
    if (!audioContextRef.current || !isNarrating) return;
    const current = audioContextRef.current.currentTime - playbackStartTimeRef.current;
    setCurrentTime(current);
    playbackOffsetRef.current = current;
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handleDownloadAudio = async () => {
    setIsAudioDownloading(true);
    setTtsError(null); // Clear error on new download attempt
    try {
      let buffer = audioBufferRef.current;
      if (!buffer) {
        const base64Audio = await generateSpeech(editableContent, story.voiceName, story.genre);
        const audioData = decode(base64Audio);
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        audioBufferRef.current = buffer;
        setDuration(buffer.duration);
      }

      const pcmData = new Int16Array(buffer.length);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i] = s < 0 ? s * 32768 : s * 32767;
      }
      
      const mp3Blob = createMp3File(pcmData, 24000);
      const url = URL.createObjectURL(mp3Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${story.title.substring(0, 30)}.mp3`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Audio download failed:", error);
      const msg = error.message || "အသံဖိုင်ဒေါင်းလုတ်ဆွဲ၍ မရပါ။";
      setTtsError(msg);
    } finally {
      setIsAudioDownloading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Poster Section */}
      {(story.imageUrl || isImageGenerating) && (
        <div className="relative group overflow-hidden rounded-3xl shadow-2xl bg-slate-200 aspect-video flex items-center justify-center">
          {isImageGenerating ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-slate-600 font-bold animate-pulse">ရုပ်ပုံဖန်တီးနေပါသည်...</p>
            </div>
          ) : (
            <>
              <img src={story.imageUrl} alt={story.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <button onClick={() => setShowPosterSettings(true)} className="bg-white/20 backdrop-blur-md text-white p-3 rounded-xl hover:bg-white/30 transition-all flex items-center gap-2">
                  <Settings2 size={18} />
                  <span className="font-bold text-sm">Poster Settings</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Story Content Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Controls Header */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleNarration}
              disabled={isTtsLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                isNarrating 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
              }`}
            >
              {isTtsLoading ? <Loader2 size={18} className="animate-spin" /> : (isNarrating ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />)}
              <span>{isNarrating ? 'ရပ်မည်' : 'နားထောင်မည်'}</span>
            </button>
            
            <button onClick={() => setIsEditing(!isEditing)} className={`p-2.5 rounded-xl transition-all ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-200'}`} title="Edit Story">
              <Edit3 size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-200 transition-all relative" title="Copy">
              {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
            </button>
            <button onClick={handleDownloadTxt} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-200 transition-all" title="Download TXT"><FileText size={20} /></button>
            <button onClick={handleDownloadPdf} disabled={isPdfDownloading} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-200 transition-all" title="Download PDF">{isPdfDownloading ? <Loader2 size={20} className="animate-spin" /> : <FileDown size={20} />}</button>
            <button onClick={handleDownloadAudio} disabled={isAudioDownloading} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-200 transition-all" title="Download MP3">{isAudioDownloading ? <Loader2 size={20} className="animate-spin" /> : <Music size={20} />}</button>
          </div>
        </div>

        {/* Audio Error Alert */}
        {ttsError && (
          <div className="bg-red-50 border-b border-red-100 p-4 sm:px-6 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm font-bold leading-tight">{ttsError}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleNarration}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RotateCcw size={14} />
                <span>ပြန်လည်ကြိုးစားမည်</span>
              </button>
              <button 
                onClick={() => setTtsError(null)}
                className="text-red-400 hover:text-red-600 p-1.5 transition-colors"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Audio Progress Bar */}
        {(isNarrating || currentTime > 0) && (
          <div className="h-1.5 bg-slate-100 w-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-100 ease-linear" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
          </div>
        )}

        {/* Story Content */}
        <article ref={storyRef} className="p-6 sm:p-10 md:p-12 space-y-8 bg-white min-h-[400px]">
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">{GENRE_LABELS[story.genre as any] || story.genre}</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight">{story.title}</h1>
            <div className="w-16 h-1 bg-indigo-600 mx-auto rounded-full"></div>
          </div>

          {isEditing ? (
            <textarea value={editableContent} onChange={(e) => setEditableContent(e.target.value)} className="w-full min-h-[500px] p-6 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 outline-none font-sans leading-relaxed text-lg sm:text-xl text-slate-800 bg-slate-50 transition-all" />
          ) : (
            <div className="prose prose-slate prose-lg sm:prose-xl max-w-none">
              <div className="whitespace-pre-line text-slate-700 leading-relaxed font-sans text-lg sm:text-xl">{editableContent}</div>
            </div>
          )}
        </article>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {!story.imageUrl && (
          <button onClick={() => setShowPosterSettings(true)} className="flex-1 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all group">
            <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
            <span>AI ရုပ်ပုံဖန်တီးမည်</span>
          </button>
        )}
        <button onClick={onReset} className="flex-1 bg-slate-900 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg"><RefreshCw className="w-5 h-5" /><span>ဇာတ်လမ်းအသစ်ဖန်တီးမည်</span></button>
      </div>

      {/* Poster Generation Modal */}
      {showPosterSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Palette className="text-indigo-600" /> Poster Settings</h3>
              <button onClick={() => setShowPosterSettings(false)} className="text-slate-400 hover:text-slate-600"><Square size={20} className="rotate-45" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Artistic Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {POSTER_STYLES.map(s => (
                    <button key={s} onClick={() => setPosterConfig(prev => ({ ...prev, style: s }))} className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${posterConfig.style === s ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-300'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Aspect Ratio</label>
                  <select value={posterConfig.aspectRatio} onChange={(e) => setPosterConfig(prev => ({ ...prev, aspectRatio: e.target.value }))} className="w-full p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold text-sm">
                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Resolution</label>
                  <select value={posterConfig.imageSize} onChange={(e) => setPosterConfig(prev => ({ ...prev, imageSize: e.target.value }))} className="w-full p-3 rounded-xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold text-sm">
                    {IMAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleGeneratePoster} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"><Sparkles size={20} /><span>ရုပ်ပုံစတင်ဖန်တီးမည်</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryDisplay;