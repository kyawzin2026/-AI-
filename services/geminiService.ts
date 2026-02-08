
import { GoogleGenAI, Modality } from "@google/genai";
import { StoryParams, Genre } from "../types";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key configuration error. ကျေးဇူးပြု၍ API Key ကို စစ်ဆေးပါ။");
  }
  return new GoogleGenAI({ apiKey });
};

const getGenreNarrationStyle = (genre?: string) => {
  switch (genre) {
    case Genre.ROMANCE:
      return `
        - အသံကို အလွန်နူးညံ့ပြီး ကြင်နာသော လေသံ (Warm and Tender Tone) ဖြင့် ဖတ်ပါ။
        - အချစ်ခန်းများတွင် စကားလုံးများကို အနည်းငယ် ဆွဲဖတ်ပြီး ရင်ခုန်သံပါအောင် လုပ်ပါ။
      `;
    case Genre.FANTASY:
      return `
        - ခမ်းနားထည်ဝါပြီး ဆန်းကြယ်သော လေသံ (Epic and Mystical Tone) ဖြင့် ဖတ်ပါ။
        - မှော်ဆန်သော အခိုက်အတန့်များကို လေးနက်စွာ ဖတ်ပါ။
      `;
    case Genre.THRILLER:
      return `
        - ရင်တထိတ်ထိတ် ဖြစ်စေမည့် တင်းမာသော လေသံ (Tense and Breathless Tone) ဖြင့် ဖတ်ပါ။
        - အရှိန်ကို မြန်ဆန်စွာ (Fast-paced) တင်ဆက်ပါ။
      `;
    case Genre.HISTORICAL:
      return `
        - လေးနက်တည်ကြည်ပြီး သမိုင်းဝင် ဂုဏ်သိက္ခာရှိသော လေသံ (Stately and Dignified Tone) ဖြင့် ဖတ်ပါ။
        - အဘိုးအဘွားများ ပုံပြင်ပြောပြသကဲ့သို့ ဖတ်ပါ။
      `;
    case Genre.SCIFI:
      return `
        - အနာဂတ်ဆန်သော၊ တိကျပြတ်သားသော လေသံ (Futuristic and Precise Tone) ဖြင့် ဖတ်ပါ။
      `;
    case Genre.FOLKLORE:
      return `
        - ရိုးရာပုံပြင် ပြောပြသူတစ်ဦးကဲ့သို့ ရင်းနှီးနွေးထွေးသော လေသံ (Nostalgic and Engaging Tone) ဖြင့် ဖတ်ပါ။
      `;
    case Genre.DRAMA:
      return `
        - စိတ်ခံစားမှု အလွန်ပါဝင်သော လေသံ (Deeply Empathic and Emotional Tone) ဖြင့် ဖတ်ပါ။
      `;
    default:
      return "ကြည်လင်ပြတ်သားပြီး စိတ်ဝင်စားစရာကောင်းသော လေသံဖြင့် ဖတ်ပေးပါ။ စာကြောင်းအလိုက် ခံစားချက် ပါဝင်ပါစေ။";
  }
};

export const generateStoryStream = async function* (params: StoryParams) {
  const ai = getAI();
  const modelId = 'gemini-3-pro-preview'; 

  const getGenreNuance = (genre: Genre) => {
    switch (genre) {
      case Genre.ROMANCE: return "နူးညံ့သိမ်မွေ့သော၊ ကဗျာဆန်သော အရေးအသားကို အသုံးပြုပါ။";
      case Genre.FANTASY: return "မြင်ကွင်းများကို ပီပီပြင်ပြင် ပုံဖော်ဖော်ပြပါ။ မှော်ဆန်သော အခိုက်အတန့်များကို အသားပေးပါ။";
      case Genre.THRILLER: return "ရင်တထိတ်ထိတ် ဖြစ်စေမည့် အရှိန်အဟုန်ကို ထိန်းရှိမ်းပါ။";
      case Genre.HISTORICAL: return "သမိုင်းအရှိန်အဝါကို ဖော်ပြပါ။ ခေတ်ဟောင်း မြန်မာဝေါဟာရများကို သင့်တင့်သလို အသုံးပြုပါ။";
      case Genre.SCIFI: return "အနာဂတ်နည်းပညာနှင့် စိတ်ကူးစိတ်သန်းများကို ဆန်းသစ်စွာ တင်ပြပါ။";
      case Genre.FOLKLORE: return "ရိုးရာပုံပြင်ဟန်ဖြင့် ရေးသားပါ။ သင်ခန်းစာပေးသော အပိုင်းများ ပါဝင်ပါစေ။";
      case Genre.DRAMA: return "ဇာတ်ကောင်များ၏ ဘဝပဋိပက္ခများကို လေးနက်စွာ ဖော်ပြပါ။";
      default: return "မြန်မာစကားပြေ အရေးအသားကို လှပချောမွေ့စွာ အသုံးပြုပါ။";
    }
  };

  const systemInstruction = `
    သင်သည် မြန်မာစာပေလောကတွင် အလွန်ထင်ရှားသော ဝတ္ထုရေးဆရာကြီး တစ်ဦးဖြစ်သည်။
    ${getGenreNuance(params.genre)}
    ဇာတ်ကွက်ကို စိတ်ဝင်စားစရာကောင်းအောင် တည်ဆောက်ပါ။ 
    ဇာတ်ကောင်များကို ပီပြင်အောင် ရေးသားပါ။ 
    မျှော်လင့်မထားသော အလှည့်အပြောင်းများ ထည့်သွင်းပါ။
  `;

  const prompt = `
    အောက်ပါ အချက်အလက်များကို အခြေခံ၍ မြန်မာဝတ္ထုတစ်ပုဒ် ရေးသားပေးပါ။
    
    အမျိုးအစား: ${params.genre}
    စာလုံးရေ: ${params.length}
    အဓိကဇာတ်ကောင်: ${params.protagonist || 'အမည်မသိ ဇာတ်ကောင်'}
    ဇာတ်ကောင်နောက်ခံ: ${params.protagonistBackground || 'မရှိပါ'}
    ဇာတ်လမ်းအကျဉ်း: ${params.topic}

    သတ်မှတ်ချက်:
    - ပထမဆုံး စာကြောင်းတွင် "ဇာတ်လမ်းခေါင်းစဉ်" ကို ရေးပါ။
    - ထို့နောက် ဇာတ်လမ်းကို အစ၊ အလယ်၊ အဆုံး ပီပြင်စွာ ရေးသားပါ။
  `;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
        topP: 0.95,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "ဇာတ်လမ်းဖန်တီးရာတွင် အမှားတစ်ခု ဖြစ်ပွားခဲ့ပါသည်။");
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore', genre?: string) => {
  const ai = getAI();
  
  // Truncate to avoid model timeout/overload
  const maxTtsChars = 1500;
  let textToSpeak = text;
  if (text.length > maxTtsChars) {
    textToSpeak = text.substring(0, maxTtsChars);
  }

  const narrationStyle = getGenreNarrationStyle(genre);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `Read this story in Myanmar with the following style: ${narrationStyle}\n\nSTORY TEXT:\n${textToSpeak}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    // Model might return text parts before the audio part. Search all parts.
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    
    console.error("No audio data found in response parts", response);
    throw new Error("API မှ အသံဒေတာ ပြန်မပေးပါ။");
  } catch (error: any) {
    console.error("TTS API Error:", error);
    if (error.message?.includes("SAFETY")) {
      throw new Error("စာသားထဲတွင် လုံခြုံရေးနှင့်မကိုက်ညီသော စကားလုံးများ ပါဝင်နေသဖြင့် အသံထွက်ဖတ်၍မရပါ။");
    }
    throw error;
  }
};

export const generatePoster = async (
  title: string, 
  content: string, 
  genre: string, 
  aspectRatio: string = "16:9", 
  imageSize: string = "2K",
  style: string = "Cinematic"
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const stylePrompts: Record<string, string> = {
    "Cinematic": "Epic movie poster style, dramatic lighting.",
    "Oil Painting": "Rich oil painting texture, visible brushstrokes.",
    "Minimalist": "Clean, simple, symbolic graphic design.",
    "Dark & Gritty": "Moody, dark atmosphere, film noir influence.",
    "Burmese Art": "Traditional Myanmar motifs and aesthetic.",
    "Vibrant Anime": "Vibrant colors, expressive anime style."
  };

  const visualPrompt = `
    Movie poster for a Myanmar story titled "${title}".
    Genre: ${genre}.
    Style: ${stylePrompts[style] || stylePrompts["Cinematic"]}
    Content: ${content.substring(0, 300)}.
    NO TEXT, NO LOGOS.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: visualPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: imageSize as any
        }
      },
    });

    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const parts = candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data returned from model.");
  } catch (error: any) {
    console.error("Poster Generation Error:", error);
    const errorMsg = error.message || "";
    if (errorMsg.includes("403") || errorMsg.includes("permission")) {
      throw new Error("RESELECT_KEY");
    }
    throw error;
  }
};
