"use client";

import { useState, useRef, useEffect } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function AIAssistantBox() {
  const { dailyData, updateAllMeals, macroGoals, activeProfile } = useAppContext();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleModify = async () => {
    if (!prompt.trim()) return;

    const userText = prompt.trim();
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setPrompt("");
    setLoading(true);

    try {
      // Calculate current totals
      const currentTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      Object.values(dailyData.meals).forEach(entries => {
        entries.forEach(entry => {
          currentTotals.calories += entry.macros.calories;
          currentTotals.protein += entry.macros.protein;
          currentTotals.carbs += entry.macros.carbs;
          currentTotals.fats += entry.macros.fats;
        });
      });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          chatHistory: messages,
          currentMeals: dailyData.meals,
          currentTotals,
          macroGoals,
          profile: activeProfile
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.action === "modify_meals" && data.meals) {
          updateAllMeals(data.meals);
          setMessages(prev => [...prev, { role: "assistant", text: data.message || "Meals updated successfully!" }]);
        } else if (data.action === "chat") {
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
    <Card className="mb-6 p-4 border-none shadow-sm bg-surface-secondary flex flex-col">
      <div className="flex items-center space-x-2 mb-2 text-foreground font-semibold">
        <SparklesIcon className="w-5 h-5 text-pixel-mint" />
        <span>Smart Assistant</span>
      </div>

      {messages.length === 0 ? (
        <p className="text-xs text-foreground/70 mb-3 leading-relaxed">
          Ask to adjust portions (e.g., &quot;I ate half the sandwich&quot;), add new foods, or get personalized recommendations based on your habits!
        </p>
      ) : (
        <div ref={scrollRef} className="flex-1 max-h-60 overflow-y-auto mb-3 space-y-3 pr-2 scrollbar-thin">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`text-sm px-3 py-2 rounded-2xl max-w-[85%] shadow-sm ${msg.role === "user" ? "bg-pixel-mint text-white rounded-br-none" : "bg-surface border border-border text-foreground rounded-bl-none"}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start">
               <div className="text-sm px-3 py-2 rounded-2xl max-w-[85%] bg-surface border border-border text-foreground rounded-bl-none flex space-x-1 items-center h-9">
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-2 mt-auto">
        <Input
          className="bg-surface border border-border shadow-sm flex-1 text-sm h-10 rounded-xl"
          placeholder="Ask something..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleModify()}
          disabled={loading}
        />
        <Button
          variant="default"
          className="h-10 px-4 rounded-xl shadow-sm"
          onClick={handleModify}
          disabled={loading || !prompt.trim()}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}
