import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../utils/api";
import "./AssistantChat.css";

const shortcuts = [
  "Summarize my weekly progress",
  "Suggest a LeetCode problem",
  "Explain a DSA concept",
];

function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I’m your DevTracker Assistant. I can help you reason through DSA, plan a study session, or make sense of your coding progress." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function sendMessage(rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message || sending) return;
    const priorMessages = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setError("");
    setSending(true);
    try {
      const result = await apiRequest("/v1/ai/chat", {
        method: "POST",
        body: { message, history: priorMessages },
      });
      setMessages((current) => [...current, result.message]);
    } catch (requestError) {
      setError(requestError.message || "The assistant is unavailable right now.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="assistant-chat-root">
      {open && (
        <section className="assistant-chat-panel" aria-label="DevTracker Assistant" role="dialog" aria-modal="false">
          <header className="assistant-chat-header">
            <div className="assistant-avatar" aria-hidden="true">✳</div>
            <div className="assistant-heading">
              <strong>DevTracker Assistant</strong>
              <span><i /> AI coding companion</span>
            </div>
            <button className="assistant-close" type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="assistant-chat-messages" ref={scrollRef} aria-live="polite">
            {messages.map((message, index) => (
              <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.role === "assistant" && <span className="assistant-message-mark">✳</span>}
                <p>{message.content}</p>
              </div>
            ))}
            {sending && <div className="assistant-message assistant"><span className="assistant-message-mark">✳</span><div className="assistant-typing" aria-label="Assistant is typing"><i /><i /><i /></div></div>}
            {error && <p className="assistant-error" role="alert">{error}</p>}
          </div>
          <div className="assistant-chat-composer">
            <div className="assistant-shortcuts" aria-label="Quick prompts">
              {shortcuts.map((shortcut) => <button type="button" key={shortcut} disabled={sending} onClick={() => sendMessage(shortcut)}>{shortcut}</button>)}
            </div>
            <form onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}>
              <label className="assistant-sr-only" htmlFor="assistant-prompt">Message DevTracker Assistant</label>
              <textarea id="assistant-prompt" ref={inputRef} value={input} rows={1} maxLength={6000} placeholder="Ask about DSA, goals, or your next step…" onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(input); } }} />
              <button type="submit" disabled={sending || !input.trim()} aria-label="Send message">↑</button>
            </form>
            <small>AI can make mistakes. Review code before using it.</small>
          </div>
        </section>
      )}
      <button className={`assistant-launcher ${open ? "is-open" : ""}`} type="button" aria-label={open ? "Close DevTracker Assistant" : "Open DevTracker Assistant"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? "×" : <><span className="assistant-launcher-spark">✳</span><span className="assistant-launcher-label">Ask AI</span></>}
      </button>
    </div>
  );
}

export default AssistantChat;
