"use client";

import { useState, useRef, useEffect } from "react";
import { SparklesIcon, XMarkIcon, ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { CameraIcon, MicrophoneIcon, TrashIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { MealType } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  proposed_foods?: any[];
  analysis_description?: string;
  approved?: boolean;
  target_date?: string;
}

export function GlobalChatbot() {
  const { dailyData, updateAllMeals, addEntry, macroGoals, activeProfile, setDailyWeight } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Multimedia States
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string; previewUrl: string } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{ data: string; mimeType: string; previewUrl: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen, selectedImage, selectedAudio]);

  useEffect(() => {
    if (!isOpen && showLiveCamera) {
      stopLiveCamera();
    }
  }, [isOpen]);

  useEffect(() => {
    if (showLiveCamera) {
      startLiveCamera(facingMode);
    }
  }, [facingMode, showLiveCamera]);

  const startLiveCamera = async (mode: "environment" | "user") => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach(track => track.stop());
      }
      setShowLiveCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("No se pudo iniciar la cámara en vivo. Abriendo cámara del dispositivo...");
      setShowLiveCamera(false);
      cameraInputRef.current?.click();
    }
  };

  const stopLiveCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowLiveCamera(false);
  };

  const compressImage = (file: File): Promise<{ data: string; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max_size = 1000;

          if (width > height) {
            if (width > max_size) {
              height = Math.round(height * (max_size / width));
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width = Math.round(width * (max_size / height));
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            const base64 = dataUrl.split(",")[1];
            resolve({ data: base64, previewUrl: dataUrl });
          } else {
            reject(new Error("Failed to get canvas context"));
          }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    const max_size = 1000;

    if (width > height) {
      if (width > max_size) {
        height = Math.round(height * (max_size / width));
        width = max_size;
      }
    } else {
      if (height > max_size) {
        width = Math.round(width * (max_size / height));
        height = max_size;
      }
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const base64Url = canvas.toDataURL("image/jpeg", 0.7);
      const base64 = base64Url.split(",")[1];
      setSelectedImage({
        data: base64,
        mimeType: "image/jpeg",
        previewUrl: base64Url
      });
      stopLiveCamera();
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setSelectedImage({
        data: compressed.data,
        mimeType: "image/jpeg",
        previewUrl: compressed.previewUrl
      });
    } catch (err) {
      console.error("Error compressing image:", err);
      const reader = new FileReader();
      reader.onload = (event) => {
         const base64Url = event.target?.result as string;
         const base64 = base64Url.split(',')[1];
         setSelectedImage({ data: base64, mimeType: file.type || 'image/jpeg', previewUrl: base64Url });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
         if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
         const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
         const reader = new FileReader();
         reader.onload = (e) => {
            const base64Url = e.target?.result as string;
            const base64 = base64Url.split(',')[1];
            setSelectedAudio({ data: base64, mimeType: 'audio/webm', previewUrl: base64Url });
         };
         reader.readAsDataURL(audioBlob);
         stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleModify = async () => {
    if (!prompt.trim() && !selectedImage && !selectedAudio) return;

    const userText = prompt.trim();
    const currentImg = selectedImage;
    const currentAud = selectedAudio;

    setMessages(prev => [...prev, { 
       role: "user", 
       text: userText || (currentImg ? "📷 [Imagen adjunta]" : "🎙️ [Audio adjunto]"),
       imageUrl: currentImg?.previewUrl,
       audioUrl: currentAud?.previewUrl
    }]);
    setPrompt("");
    setSelectedImage(null);
    setSelectedAudio(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s de timeout

    try {
      // Calculate current totals
      const currentTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      if (dailyData?.meals) {
        Object.values(dailyData.meals).forEach(entries => {
          entries.forEach(entry => {
            currentTotals.calories += entry.macros.calories;
            currentTotals.protein += entry.macros.protein;
            currentTotals.carbs += entry.macros.carbs;
            currentTotals.fats += entry.macros.fats;
          });
        });
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          chatHistory: messages.map(m => ({ role: m.role, text: m.text })),
          currentMeals: dailyData?.meals || {},
          currentTotals,
          macroGoals,
          profile: activeProfile,
          image: currentImg ? { data: currentImg.data, mimeType: currentImg.mimeType } : undefined,
          audio: currentAud ? { data: currentAud.data, mimeType: currentAud.mimeType } : undefined,
          todayDate: new Date().toLocaleDateString("en-CA"),
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      console.log("CLIENT RECEIVED AI DATA:", data);
      if (res.ok) {
        if (data.action === "propose_meal" && data.proposed_foods) {
           setMessages(prev => [...prev, {
              role: "assistant",
              text: data.message || "He analizado tu solicitud. Por favor revisa y aprueba el alimento propuesto:",
              proposed_foods: data.proposed_foods,
              analysis_description: data.analysis_description,
              target_date: data.target_date
           }]);
        } else if (data.action === "modify_meals" && data.meals) {
          const sanitizeEntries = (entries: any[]) => {
             if (!Array.isArray(entries)) return [];
             return entries.map(e => ({
                id: e.id || Math.random().toString(36).substring(2, 9),
                name: e.name || "Unknown Food",
                grams: e.grams || 100,
                timestamp: e.timestamp || Date.now(),
                macros: e.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 },
                baseMacros: e.baseMacros || e.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 }
             }));
          };
          const sanitizedMeals = {
             Desayuno: sanitizeEntries(data.meals.Desayuno),
             Almuerzo: sanitizeEntries(data.meals.Almuerzo),
             Merienda: sanitizeEntries(data.meals.Merienda),
             Cena: sanitizeEntries(data.meals.Cena)
          };

          updateAllMeals(sanitizedMeals);
          setMessages(prev => [...prev, { role: "assistant", text: data.message || "Meals updated successfully!" }]);
        } else if (data.action === "log_weight" && data.weight) {
          setDailyWeight(data.weight);
          setMessages(prev => [...prev, { role: "assistant", text: data.message }]);
        } else if (data.action === "chat" || data.action === "fetch_history") {
          setMessages(prev => [...prev, { role: "assistant", text: data.message }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: "No estoy seguro de cómo procesar esa acción." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: `Error: ${data.error}` }]);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
         setMessages(prev => [...prev, { role: "assistant", text: "El asistente está tardando más de lo habitual en responder. Por favor, reintenta tu mensaje." }]);
      } else {
         setMessages(prev => [...prev, { role: "assistant", text: "Error de conexión con el asistente." }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProposal = async (idx: number, foods: any[], targetDate?: string) => {
    const getTodayStringLocal = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getTodayStringLocal();
    const date = targetDate || todayStr;
    const isToday = date === todayStr;

    for (const food of foods) {
       const mealType: MealType = food.mealType || "Cena";
       const entryData = {
          name: food.name,
          grams: food.grams || 100,
          macros: food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 },
          baseMacros: food.baseMacros || food.macros || { calories: 0, protein: 0, carbs: 0, fats: 0 }
       };

       if (isToday) {
          addEntry(mealType, entryData);
       } else {
          try {
             const { supabase } = await import("@/lib/supabase");
             await supabase.from('food_logs').insert({
                profile: activeProfile,
                date: date,
                time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false }),
                meal_type: mealType,
                product_name: entryData.name,
                amount: entryData.grams,
                calories: entryData.macros.calories || 0,
                protein: entryData.macros.protein || 0,
                carbs: entryData.macros.carbs || 0,
                fats: entryData.macros.fats || 0,
                cholesterol: food.macros?.cholesterol || 0,
                sodium: food.macros?.sodium || 0,
                sugar: food.macros?.sugar || 0,
                calcium: food.macros?.calcium || 0
             });
          } catch (err) {
             console.error("Error inserting historical food log:", err);
          }
       }
    }
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, approved: true } : m));
  };

  const handleRejectProposal = (idx: number) => {
    setMessages(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-4 z-[100] p-4 bg-pixel-mint text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-pixel-mint/30"
          >
            <ChatBubbleOvalLeftEllipsisIcon className="w-7 h-7" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Overlay Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] sm:inset-auto sm:right-4 sm:bottom-4 sm:w-96 sm:rounded-2xl sm:shadow-2xl bg-background border-t sm:border border-border flex flex-col h-[100dvh] sm:h-[600px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border shadow-sm">
              <div className="flex items-center space-x-2 text-foreground font-semibold">
                <div className="p-1.5 bg-pixel-mint-light rounded-full">
                  <SparklesIcon className="w-5 h-5 text-pixel-mint" />
                </div>
                <span>NutriBot</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:bg-surface-secondary transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Live Camera View inside Chat Overlay */}
            {showLiveCamera && (
              <div className="absolute inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 text-white animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <CameraIcon className="w-5 h-5 text-pixel-mint" />
                    Tomar Foto al Plato
                  </span>
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative flex-1 my-4 flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/10 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="flex items-center justify-around pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFacingMode(prev => prev === "environment" ? "user" : "environment");
                    }}
                    className="p-3 bg-white/10 rounded-full hover:bg-white/20 text-xs flex flex-col items-center gap-1 transition-colors"
                  >
                    <span>🔄 Girar</span>
                  </button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full border-4 border-white bg-pixel-mint shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/20" />
                  </button>

                  <div className="w-12" />
                </div>
              </div>
            )}

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin pb-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-pixel-mint/10 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-8 h-8 text-pixel-mint" />
                  </div>
                  <p className="text-sm text-foreground/70 max-w-[80%] leading-relaxed">
                    ¡Hola! Soy tu asistente nutricional con IA. <br/><br/>
                    Puedes pedirme que: <br/>
                    • Anote comidas ("Comí 2 rebanadas de pan")<br/>
                    • Analice fotos 📸 (ej. sube tu tortilla o plato)<br/>
                    • Grabar notas de voz 🎙️ explicándome qué comiste.<br/>
                    ¡Siempre te pediré confirmación antes de registrar!
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={idx} 
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className={`text-[15px] px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm space-y-2 ${msg.role === "user" ? "bg-pixel-mint text-white rounded-br-sm" : "bg-surface border border-border text-foreground rounded-bl-sm"}`}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Uploaded" className="rounded-xl max-h-40 object-cover border border-white/20" />
                      )}
                      {msg.audioUrl && (
                        <audio controls src={msg.audioUrl} className="w-full max-w-[200px] h-8 mt-1" />
                      )}
                      <p>{msg.text}</p>
                    </div>

                    {/* Proposal Interactive Card */}
                    {msg.proposed_foods && msg.proposed_foods.length > 0 && (
                      <div className="mt-2 w-[90%] bg-surface border-2 border-pixel-mint/60 rounded-2xl p-3.5 shadow-md space-y-3">
                        <div className="flex items-center space-x-2 text-pixel-mint font-semibold text-xs uppercase tracking-wider">
                          <SparklesIcon className="w-4 h-4" />
                          <span>Propuesta de Registro</span>
                        </div>

                        {msg.analysis_description && (
                          <div className="bg-pixel-mint-light/40 p-2.5 rounded-xl text-xs text-foreground/90 leading-relaxed border border-pixel-mint/20">
                            <strong>Desglose IA:</strong> {msg.analysis_description}
                          </div>
                        )}

                        <div className="space-y-2">
                          {msg.proposed_foods.map((food, fIdx) => (
                            <div key={fIdx} className="bg-surface-secondary p-2.5 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between font-semibold text-sm">
                                <span>{food.name}</span>
                                <span className="text-pixel-mint">{food.mealType}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Porción: {food.grams}g</span>
                                <span className="font-medium text-foreground">{Math.round(food.macros?.calories || 0)} kcal</span>
                              </div>
                              <div className="flex space-x-2 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                <span>P: {Math.round(food.macros?.protein || 0)}g</span>
                                <span>C: {Math.round(food.macros?.carbs || 0)}g</span>
                                <span>G: {Math.round(food.macros?.fats || 0)}g</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {msg.approved ? (
                          <div className="flex items-center justify-center space-x-1.5 py-2 bg-green-100 text-green-800 rounded-xl font-medium text-xs">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>¡Aprobado y Anotado!</span>
                          </div>
                        ) : (
                          <div className="flex space-x-2 pt-1">
                            <Button
                              variant="mint"
                              size="sm"
                              className="flex-1 text-xs py-2 shadow-sm font-semibold"
                              onClick={() => handleApproveProposal(idx, msg.proposed_foods || [], msg.target_date)}
                            >
                              ✅ Aprobar y Registrar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs py-2 text-red-600 hover:bg-red-50 border-red-200"
                              onClick={() => handleRejectProposal(idx)}
                            >
                              ❌
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start">
                  <div className="px-4 py-3 rounded-2xl max-w-[85%] bg-surface border border-border text-foreground rounded-bl-sm flex space-x-1.5 items-center">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Multimedia attachments preview bar */}
            {(selectedImage || selectedAudio) && (
              <div className="px-3 py-2 bg-surface-secondary border-t border-border flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-medium text-foreground">
                  {selectedImage && (
                    <div className="flex items-center space-x-1 bg-surface px-2 py-1 rounded-lg border border-border">
                      <span>📷 Foto lista ({selectedImage.mimeType.split('/')[1]})</span>
                      <button onClick={() => setSelectedImage(null)} className="text-red-500 hover:text-red-700 ml-1">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {selectedAudio && (
                    <div className="flex items-center space-x-1 bg-surface px-2 py-1 rounded-lg border border-border">
                      <span>🎙️ Audio grabado</span>
                      <button onClick={() => setSelectedAudio(null)} className="text-red-500 hover:text-red-700 ml-1">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedImage(null); setSelectedAudio(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Limpiar adjuntos
                </button>
              </div>
            )}

            {/* Input Box */}
            <div className="p-3 pb-6 sm:pb-3 bg-surface border-t border-border relative">
              {/* Camera Menu Popover */}
              <AnimatePresence>
                {showCameraMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-16 left-3 z-50 bg-surface border border-border shadow-xl rounded-2xl p-2 w-64 space-y-1"
                  >
                    <div className="text-[11px] font-semibold text-muted-foreground px-2.5 py-1.5 uppercase tracking-wider">
                      Opciones de Foto
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCameraMenu(false);
                        // En dispositivos móviles como el Google Pixel 10, abrimos la cámara nativa de alta calidad (HDR+, flash, enfoque nativo) via capture="environment".
                        // En PC escritorio (o sin móvil detectado), abrimos el visor de cámara en vivo o el explorador.
                        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
                        if (isMobile) {
                          cameraInputRef.current?.click();
                        } else {
                          startLiveCamera(facingMode);
                        }
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-pixel-mint-light hover:text-pixel-mint flex items-center space-x-2.5 transition-colors"
                    >
                      <CameraIcon className="w-4 h-4 text-pixel-mint" />
                      <span>📸 Tomar Foto (Cámara)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCameraMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-surface-secondary flex items-center space-x-2.5 transition-colors"
                    >
                      <span>🖼️ Subir desde Galería</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  onChange={handleImagePick}
                  className="hidden"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImagePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowCameraMenu(prev => !prev)}
                  disabled={loading}
                  title="Opciones de cámara y foto"
                  className={`p-2.5 rounded-xl transition-colors ${showCameraMenu ? "bg-pixel-mint text-white" : "text-muted-foreground hover:text-pixel-mint hover:bg-pixel-mint-light/50"}`}
                >
                  <CameraIcon className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={loading}
                  title={isRecording ? "Detener grabación" : "Grabar nota de voz"}
                  className={`p-2.5 rounded-xl transition-colors ${isRecording ? "bg-red-500 text-white animate-pulse shadow-md" : "text-muted-foreground hover:text-red-500 hover:bg-red-50"}`}
                >
                  <MicrophoneIcon className="w-6 h-6" />
                </button>

                <Input
                  className="bg-background border border-border shadow-sm flex-1 text-[15px] h-12 rounded-xl focus-visible:ring-pixel-mint"
                  placeholder={isRecording ? "Grabando voz... presiona de nuevo para parar" : "Escribe un mensaje o adjunta foto..."}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleModify()}
                  disabled={loading || isRecording}
                />
                <Button
                  variant="default"
                  className="h-12 w-12 rounded-xl shadow-sm bg-pixel-mint hover:bg-pixel-mint/90 flex items-center justify-center p-0"
                  onClick={handleModify}
                  disabled={loading || (!prompt.trim() && !selectedImage && !selectedAudio)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1">
                    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                  </svg>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
