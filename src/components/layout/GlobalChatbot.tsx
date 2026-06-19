"use client";

import { useState, useRef, useEffect } from "react";
import { SparklesIcon, XMarkIcon, ChatBubbleOvalLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function GlobalChatbot() {
  const { dailyData, updateAllMeals, macroGoals, activeProfile, setWeightForDate } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isOpen]);

  const handleModify = async () => {
    if (!prompt.trim()) return;

    const userText = prompt.trim();
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setPrompt("");
    setLoading(true);

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
          chatHistory: messages,
          currentMeals: dailyData?.meals || {},
          currentTotals,
          macroGoals,
          profile: activeProfile
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.action === "modify_meals" && data.meals) {
          // Sanitize incoming meals from AI to prevent missing data crashes
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
          const today = new Date().toISOString().split('T')[0];
          await setWeightForDate(today, data.weight);
          setMessages(prev => [...prev, { role: "assistant", text: data.message }]);
        } else if (data.action === "chat" || data.action === "fetch_history") {
          setMessages(prev => [...prev, { role: "assistant", text: data.message }]);
        } else {
          setMessages(prev => [...prev, { role: "assistant", text: "I'm not sure how to handle that." }]);
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: `Error: ${data.error}` }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", text: "Connection error with the assistant." }]);
    } finally {
      setLoading(false);
    }
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
            className="fixed bottom-20 right-4 z-50 p-4 bg-pixel-mint text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-pixel-mint/30"
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
            className="fixed inset-x-0 bottom-0 z-50 sm:right-4 sm:left-auto sm:bottom-4 sm:w-96 sm:rounded-2xl sm:shadow-2xl bg-background border-t sm:border border-border flex flex-col h-[80vh] sm:h-[600px] overflow-hidden"
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

            {/* Chat History */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin pb-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-pixel-mint/10 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-8 h-8 text-pixel-mint" />
                  </div>
                  <p className="text-sm text-foreground/70 max-w-[80%] leading-relaxed">
                    ¡Hola! Soy tu asistente nutricional impulsado por IA. <br/><br/>
                    Puedes pedirme que: <br/>
                    • Agregue comidas ("Comí 2 rebanadas de pan con queso")<br/>
                    • Registre tu peso ("Anota que peso 75.5kg hoy")<br/>
                    • Revise tu historial o te dé consejos.
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
                    <div className={`text-[15px] px-4 py-2.5 rounded-2xl max-w-[85%] shadow-sm ${msg.role === "user" ? "bg-pixel-mint text-white rounded-br-sm" : "bg-surface border border-border text-foreground rounded-bl-sm"}`}>
                      {msg.text}
                    </div>
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

            {/* Input Box */}
            <div className="p-3 bg-surface border-t border-border">
              <div className="flex space-x-2">
                <Input
                  className="bg-background border border-border shadow-sm flex-1 text-[15px] h-12 rounded-xl focus-visible:ring-pixel-mint"
                  placeholder="Escribe un mensaje..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleModify()}
                  disabled={loading}
                />
                <Button
                  variant="default"
                  className="h-12 w-12 rounded-xl shadow-sm bg-pixel-mint hover:bg-pixel-mint/90 flex items-center justify-center p-0"
                  onClick={handleModify}
                  disabled={loading || !prompt.trim()}
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
