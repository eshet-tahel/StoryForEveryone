import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Trash2, Download, Loader2, Mic, MicOff, Volume2, StopCircle, PlayCircle } from 'lucide-react';

// Configuration
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const TTS_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

const App = () => {
  const [storySegments, setStorySegments] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(null); // index of playing segment
  const [isReadingAll, setIsReadingAll] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const apiKey = ""; // Provided by environment

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'he-IL';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setUserInput(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [storySegments, isAiLoading]);

  // Helper: Convert PCM16 to WAV for playback
  const pcmToWav = (pcmData, sampleRate) => {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 32 + pcmData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return buffer;
  };

  const speakText = (text, index) => {
    return new Promise(async (resolve) => {
      setIsPlayingAudio(index);
      
      try {
        const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Say naturally: ${text}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" }
                }
              }
            }
          })
        });

        const data = await response.json();
        const audioDataB64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioDataB64) {
          setIsPlayingAudio(null);
          resolve();
          return;
        }

        const mimeType = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;
        const sampleRate = parseInt(mimeType?.split('rate=')[1]) || 24000;

        const binaryString = window.atob(audioDataB64);
        const pcmData = new Int16Array(binaryString.length / 2);
        for (let i = 0; i < pcmData.length; i++) {
          pcmData[i] = (binaryString.charCodeAt(i * 2) & 0xFF) | (binaryString.charCodeAt(i * 2 + 1) << 8);
        }
        
        const wavBuffer = pcmToWav(pcmData, sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsPlayingAudio(null);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          setIsPlayingAudio(null);
          resolve();
        };
        audio.play();
      } catch (err) {
        console.error("TTS Error:", err);
        setIsPlayingAudio(null);
        resolve();
      }
    });
  };

  const playAllStory = async () => {
    if (isReadingAll || storySegments.length === 0) return;
    setIsReadingAll(true);
    
    for (let i = 0; i < storySegments.length; i++) {
      // Small delay check to ensure we haven't stopped
      await speakText(storySegments[i].text, i);
      // Wait a tiny bit between segments
      await new Promise(r => setTimeout(r, 400));
    }
    
    setIsReadingAll(false);
  };

  const stopAllPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlayingAudio(null);
    setIsReadingAll(false);
  };

  const callGemini = async (prompt, retries = 0) => {
    const systemPrompt = "You are a creative storyteller. The user is writing a story with you. The rule is: the user writes 2 lines, and you MUST respond with exactly 2 lines that continue the story. Keep the tone consistent with the user's input. Always respond in Hebrew.";
    
    try {
      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (err) {
      if (retries < 5) {
        const delay = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return callGemini(prompt, retries + 1);
      }
      throw err;
    }
  };

  const handleSend = async () => {
    if (!userInput.trim() || isAiLoading) return;
    if (isRecording) stopRecording();

    const newSegments = [...storySegments, { role: 'user', text: userInput.trim() }];
    setStorySegments(newSegments);
    setUserInput('');
    setIsAiLoading(true);
    setError(null);

    try {
      const storyContext = newSegments.map(s => `${s.role === 'user' ? 'User' : 'AI'}: ${s.text}`).join('\n');
      const aiResponse = await callGemini(storyContext);
      if (aiResponse) {
        setStorySegments(prev => [...prev, { role: 'ai', text: aiResponse.trim() }]);
      }
    } catch (err) {
      setError("שגיאה בתקשורת עם ה-AI. נסה שוב.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
    } else {
      alert("הדפדפן שלך לא תומך בזיהוי קולי.");
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetStory = () => {
    if (window.confirm("להתחיל סיפור חדש?")) {
      stopAllPlayback();
      setStorySegments([]);
      setError(null);
    }
  };

  const downloadStory = () => {
    const fullText = storySegments.map(s => `${s.role === 'user' ? 'אני' : 'AI'}: ${s.text}`).join('\n\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'story.txt';
    link.click();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-4 md:p-8 flex flex-col items-center" dir="rtl">
      <header className="max-w-3xl w-full text-center mb-8 relative">
        <div className="flex justify-center mb-4 text-amber-700">
          <BookOpen size={48} />
        </div>
        <h1 className="text-4xl font-serif font-bold text-stone-800 mb-2">סיפור בשניים</h1>
        <p className="text-stone-600 font-medium mb-4">הקליטו או הקלידו 2 שורות, וה-AI ימשיך אתכם.</p>
        
        <div className="flex justify-center gap-3">
          {storySegments.length > 0 && (
            <button 
              onClick={isReadingAll ? stopAllPlayback : playAllStory}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                isReadingAll 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              {isReadingAll ? (
                <><StopCircle size={18} /> עצור הקראה</>
              ) : (
                <><PlayCircle size={18} /> הקרא את כל הסיפור</>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl w-full flex-grow flex flex-col bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden mb-6">
        <div 
          ref={scrollRef}
          className="flex-grow overflow-y-auto p-6 space-y-6 max-h-[50vh] scroll-smooth"
        >
          {storySegments.length === 0 && !isAiLoading && (
            <div className="text-center text-stone-400 mt-12 italic border-2 border-dashed border-stone-100 p-8 rounded-xl">
              "היה היה פעם..." כאן מתחיל הקסם שלכם.
            </div>
          )}

          {storySegments.map((segment, index) => (
            <div 
              key={index} 
              className={`flex flex-col ${segment.role === 'user' ? 'items-start' : 'items-end'}`}
            >
              <div 
                className={`group relative max-w-[90%] p-4 rounded-2xl leading-relaxed whitespace-pre-wrap transition-all shadow-sm ${
                  segment.role === 'user' 
                    ? 'bg-amber-50 text-stone-800 border-r-4 border-amber-400' 
                    : 'bg-stone-100 text-stone-700 border-l-4 border-stone-400'
                } ${isPlayingAudio === index ? 'ring-4 ring-amber-200 scale-[1.02]' : ''}`}
              >
                {segment.text}
                <button 
                  onClick={() => isPlayingAudio === index ? stopAllPlayback() : speakText(segment.text, index)}
                  className={`absolute -top-3 ${segment.role === 'user' ? '-left-3' : '-right-3'} p-2 rounded-full bg-white shadow-md border border-stone-100 hover:text-amber-600 transition-colors ${isPlayingAudio === index ? 'text-amber-600 animate-pulse' : 'text-stone-400'}`}
                >
                  {isPlayingAudio === index ? <StopCircle size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400 mt-2 px-2">
                {segment.role === 'user' ? 'השורות שלך' : 'המשך ה-AI'}
              </span>
            </div>
          ))}

          {isAiLoading && (
            <div className="flex justify-end">
              <div className="bg-stone-50 p-4 rounded-2xl flex items-center gap-3 text-stone-500 italic border border-stone-100">
                <Loader2 className="animate-spin text-amber-600" size={18} />
                המוזה מגיעה... ה-AI כותב
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-center">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50/50">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={isRecording ? "מקשיב לכם..." : "כתבו או הקליטו שתי שורות מהסיפור..."}
                className={`w-full p-4 pl-12 rounded-xl border transition-all resize-none h-28 text-lg outline-none shadow-inner ${
                  isRecording 
                  ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200' 
                  : 'border-stone-200 focus:ring-2 focus:ring-amber-500 bg-white'
                }`}
              />
              <button
                onClick={toggleRecording}
                className={`absolute left-3 top-3 p-2 rounded-full transition-all ${
                  isRecording 
                  ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
                title={isRecording ? "עצור הקלטה" : "התחל הקלטה"}
              >
                {isRecording ? <StopCircle size={24} /> : <Mic size={24} />}
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button 
                  onClick={resetStory}
                  disabled={storySegments.length === 0}
                  className="p-3 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-20"
                  title="אפס סיפור"
                >
                  <Trash2 size={22} />
                </button>
                <button 
                  onClick={downloadStory}
                  disabled={storySegments.length === 0}
                  className="p-3 text-stone-400 hover:text-amber-600 transition-colors disabled:opacity-20"
                  title="הורד סיפור"
                >
                  <Download size={22} />
                </button>
              </div>

              <button
                onClick={handleSend}
                disabled={!userInput.trim() || isAiLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-3 rounded-full flex items-center gap-2 font-bold shadow-lg transition-all disabled:bg-stone-300 disabled:shadow-none transform active:scale-95"
              >
                שלח שורות
                <Send size={18} className="rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-stone-400 text-sm flex gap-4">
        <span>• דברו אל המיקרופון בבירור</span>
        <span>• כפתור ה-Play למעלה מקריא הכל ברצף</span>
      </footer>
    </div>
  );
};

export default App;