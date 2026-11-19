import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, ShieldCheck, User as UserIcon } from 'lucide-react';
import { ChatMessage, HelpRequest } from '../types';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

interface ChatModalProps {
  request: HelpRequest | null;
  onClose: () => void;
}

export function ChatModal({ request, onClose }: ChatModalProps) {
  const { firebaseUser, messages, sendMessage } = useAppContext();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const uid = firebaseUser?.uid || '';
  const requestId = request?.requestId || '';

  const requestMessages = React.useMemo(() => {
    if (!requestId) return [];
    return messages
      .filter((m) => m.requestId === requestId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [requestMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!request) return null;

  const isRequester = uid === request.requesterId;
  const partnerName = isRequester
    ? request.helperDisplayName || 'Community Helper'
    : request.requesterName;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    try {
      await sendMessage(request.requestId, trimmed);
      setInputText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[600px] max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center shrink-0">
                <MessageSquare size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="chat-modal-title" className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {partnerName}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-green bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} /> Secure
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  <span className="font-mono">{request.requestId}</span> · {request.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
            {requestMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                  <MessageSquare size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Start Coordination Chat
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Coordinate logistics, meeting point, or timing directly with {partnerName}. Messages update in real time.
                </p>
              </div>
            ) : (
              requestMessages.map((msg) => {
                const isMe = msg.senderId === uid;
                return (
                  <div
                    key={msg.id}
                    className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                  >
                    <div className="flex items-end gap-2 max-w-[82%]">
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden mb-1">
                          {msg.senderPhotoUrl ? (
                            <img
                              src={msg.senderPhotoUrl}
                              alt={msg.senderName}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon size={14} className="text-slate-500 dark:text-slate-400" />
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm',
                          isMe
                            ? 'bg-brand-blue text-white rounded-br-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                        )}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 tabular-nums">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-6 py-2 bg-red-50 dark:bg-red-950/50 text-xs text-red-600 dark:text-red-300 border-t border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              maxLength={1000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${partnerName}...`}
              aria-label="Type coordination message"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
