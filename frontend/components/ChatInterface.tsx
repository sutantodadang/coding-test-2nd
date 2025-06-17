import { FormatPercentage } from "@/utils/number";
import React, { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: Sources[];
  processing_time?: number;
}

interface Sources {
  page: number;
  content?: string;
  score?: number;
  metadata?: Metadata;
}

interface Metadata {
  pages: number;
  chunk_type: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string>("");
  const [pendingSources, setPendingSources] = useState<any[] | null>(null);
  const [pendingTime, setPendingTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingMsg]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    setError(null);
    setPendingMsg("");
    setPendingSources(null);
    setPendingTime(null);
    const userMsg: Message = {
      id: Date.now() + "-user",
      type: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setInput("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_API_URL}/api/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: userMsg.content,
            chat_history: messages
              .filter((m) => m.type === "user" || m.type === "assistant")
              .map((m) => ({ role: m.type, content: m.content })),
          }),
        }
      );
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      let fullAnswer = "";
      let meta: any = null;
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        if (value) {
          const chunk = new TextDecoder().decode(value);
          const metaIdx = chunk.indexOf("[END_META]");

          if (metaIdx !== -1) {
            fullAnswer += chunk.slice(0, metaIdx);
            try {
              meta = JSON.parse(chunk.slice(metaIdx + 10));
            } catch {
              meta = null;
            }
            done = true;
          } else {
            fullAnswer += chunk;
            setPendingMsg((prev) => prev + chunk);
          }
        }
        done = done || doneReading;
      }
      setPendingMsg("");
      setPendingSources(meta?.sources || []);
      setPendingTime(meta?.processing_time || null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + "-assistant",
          type: "assistant",
          content: fullAnswer.trim(),
          sources: meta?.sources || [],
          processing_time: meta?.processing_time,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setIsLoading(false);
      setPendingMsg("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSendMessage();
    }
  };

  console.log("Messages:", messages);
  return (
    <div className="w-full max-w-4xl mx-auto mt-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6">
          {/* Chat Messages Area */}
          <div
            className="h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            ref={scrollRef}
          >
            <div className="flex flex-col gap-4">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-lg font-medium mb-2">No messages yet</p>
                  <p className="text-sm">
                    Start the conversation by asking a question!
                  </p>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex animate-in slide-in-from-bottom-3 ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-end gap-3 max-w-[85%]">
                    {msg.type === "assistant" && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm border-2 border-blue-200">
                        AI
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md ${
                        msg.type === "user"
                          ? "bg-blue-600 text-white ml-auto"
                          : "bg-gray-50 text-gray-900 border border-gray-200"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.content}
                      </div>

                      {msg.type === "assistant" &&
                        msg.sources &&
                        msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-gray-600">
                                📄 Sources:
                              </span>
                            </div>
                            <ul className="space-y-1">
                              {msg.sources.map((src, i) => (
                                <li key={i} className="text-xs">
                                  <div className="flex items-start gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                      Page {src.page}
                                    </span>
                                    {src.content && (
                                      <span className="text-gray-600 flex-1">
                                        {src.content?.slice(0, 100)}
                                        {src.content?.length > 100 ? "..." : ""}
                                      </span>
                                    )}
                                  </div>{" "}
                                  {src.score !== undefined && (
                                    <span className="text-[10px] text-gray-400 ml-2">
                                      Relevance: {FormatPercentage(src.score)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                            {msg.processing_time && (
                              <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                                <span>⏱️</span>
                                <span>{msg.processing_time}s</span>
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {msg.type === "user" && (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm border-2 border-green-200">
                        U
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-in slide-in-from-bottom-3">
                  <div className="flex items-end gap-3 max-w-[85%]">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm border-2 border-blue-200">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>

                    <div className="rounded-2xl px-4 py-3 bg-gray-50 border border-gray-200 shadow-sm min-w-[120px]">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {pendingMsg || (
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">
                              Thinking...
                            </span>
                          </div>
                        )}
                      </div>

                      {pendingSources && pendingSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-600">
                              📄 Sources:
                            </span>
                          </div>
                          <ul className="space-y-1">
                            {pendingSources.map((src, i) => (
                              <li key={i} className="text-xs">
                                <div className="flex items-start gap-2">
                                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                    Page {src.page}
                                  </span>
                                  <span className="text-gray-600 flex-1">
                                    {src.content?.slice(0, 100)}
                                    {src.content?.length > 100 ? "..." : ""}
                                  </span>
                                </div>{" "}
                                {src.score !== undefined && (
                                  <span className="text-[10px] text-gray-400 ml-2">
                                    Relevance: {FormatPercentage(src.score)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {pendingTime && (
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                              <span>⏱️</span>
                              <span>{pendingTime}s</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Form */}
          <form
            className="flex gap-3 mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              placeholder="Ask a question about your PDF..."
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Send</span>
              )}
            </button>
          </form>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-red-600">❌</span>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
