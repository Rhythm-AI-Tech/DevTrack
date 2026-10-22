import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../utils/api";
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
    const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((current) => [
      ...current,
      { role: "user", content: message },
      { role: "assistant", content: "", id: assistantId },
    ]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const token = localStorage.getItem("devtrack_token");
      const response = await fetch(`${API_BASE_URL}/v1/ai/chat/stream`, {
        method: "POST",
        headers: {
          Accept: "text/event-stream, application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, history: priorMessages }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Assistant request failed (${response.status}).`);
      }
      if (!response.body) throw new Error("Your browser does not support streaming responses.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = "";
      const consumeEvent = (rawEvent) => {
        const dataLines = rawEvent.split(/\r?\n/).filter((line) => line.startsWith("data:"));
        if (!dataLines.length) return;
        const payloadText = dataLines.map((line) => line.slice(5).trimStart()).join("\n");
        let payload;
        try { payload = JSON.parse(payloadText); } catch { return; }
        if (payload.type === "delta" && typeof payload.text === "string") {
          receivedText += payload.text;
          setMessages((current) => current.map((item) => item.id === assistantId
            ? { ...item, content: item.content + payload.text }
            : item));
        } else if (payload.type === "error") {
          throw new Error(payload.message || "The assistant stream stopped unexpectedly.");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) consumeEvent(event);
        if (done) break;
      }
      if (buffer.trim()) consumeEvent(buffer);
      if (!receivedText) throw new Error("The assistant returned an empty response. Please try again.");
    } catch (requestError) {
      setError(requestError.message || "The assistant is unavailable right now.");
      setMessages((current) => current.filter((item) => item.id !== assistantId || item.content));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="assistant-chat-root">
      {open && (
        <section className="assistant-chat-panel" aria-label="DevTracker Assistant" role="dialog" aria-modal="false">
          <header className="assistant-chat-header">
            <div className="assistant-avatar"><img src="/devtrack-ai-avatar.png" alt="DevTracker AI mascot" /></div>
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
        {open ? "×" : <><img className="assistant-launcher-avatar" src="/devtrack-ai-avatar.png" alt="" /><span className="assistant-launcher-label">Ask AI</span></>}
      </button>
    </div>
  );
}

export default AssistantChat;
