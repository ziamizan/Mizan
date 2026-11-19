import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Phone,
  CheckCheck,
  Check,
  Droplet,
} from 'lucide-react';
import { BloodRequest } from '../types';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

interface BloodChatModalProps {
  bloodRequest: BloodRequest | null;
  partnerId: string;
  partnerName: string;
  onClose: () => void;
}

export function BloodChatModal({
  bloodRequest,
  partnerId,
  partnerName,
  onClose,
}: BloodChatModalProps) {
  const {
    firebaseUser,
    user,
    messages,
    sendBloodChatMessage,
    markChatMessagesRead,
  } = useAppContext();

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showContactSharePrompt, setShowContactSharePrompt] = useState(false);
  const [contactNumberInput, setContactNumberInput] = useState(user.mobile || '');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const uid = firebaseUser?.uid || '';
  const bloodRequestId = bloodRequest?.bloodRequestId || '';

  const threadMessages = useMemo(() => {
    if (!bloodRequestId || !uid || !partnerId) return [];
    return messages
      .filter(
        (m) =>
          m.requestId === bloodRequestId &&
          ((m.senderId === uid && (!m.recipientId || m.recipientId === partnerId)) ||
            (m.senderId === partnerId && (!m.recipientId || m.recipientId === uid)))
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages, bloodRequestId, uid, partnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (bloodRequestId && partnerId) {
      void markChatMessagesRead(bloodRequestId, partnerId);
    }
  }, [threadMessages, bloodRequestId, partnerId, markChatMessagesRead]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!bloodRequest) return null;

  const isRequester = uid === bloodRequest.requesterId;

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendBloodChatMessage(bloodRequest.bloodRequestId, {
        recipientId: partnerId,
        text: trimmed,
        messageType: 'text',
      });
      setInputText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleShareHospitalLocation = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await sendBloodChatMessage(bloodRequest.bloodRequestId, {
        recipientId: partnerId,
        text: `Hospital Location: ${bloodRequest.hospitalName}, ${bloodRequest.hospitalAddress}, ${bloodRequest.city}`,
        messageType: 'hospital_location',
        hospitalName: bloodRequest.hospitalName,
        hospitalAddress: `${bloodRequest.hospitalAddress}, ${bloodRequest.city}`,
        latitude: bloodRequest.latitude,
        longitude: bloodRequest.longitude,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to share hospital location.');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmAvailability = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await sendBloodChatMessage(bloodRequest.bloodRequestId, {
        recipientId: partnerId,
        text: `Confirmed: I am available to donate ${bloodRequest.requiredBloodGroup} blood at ${bloodRequest.hospitalName}.`,
        messageType: 'availability_confirm',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm availability.');
    } finally {
      setSending(false);
    }
  };

  const handleShareContact = async () => {
    const cleaned = contactNumberInput.trim();
    if (cleaned.length < 6) {
      setError('Enter a valid phone number before sharing with permission.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendBloodChatMessage(bloodRequest.bloodRequestId, {
        recipientId: partnerId,
        text: `Shared verified contact number with permission: ${cleaned}`,
        messageType: 'contact_share',
        sharedContact: cleaned,
      });
      setShowContactSharePrompt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to share contact.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blood-chat-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-red-200 dark:border-slate-800 overflow-hidden flex flex-col h-[640px] max-h-[88vh]"
        >
          {/* Medical Red/White Header */}
          <div className="px-5 py-4 border-b border-red-100 dark:border-slate-800 flex items-center justify-between bg-red-50/70 dark:bg-slate-950">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                <Droplet size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="blood-chat-title" className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {partnerName}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck size={11} /> Direct Thread
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                    {bloodRequest.bloodRequestId}
                  </span>{' '}
                  · {bloodRequest.requiredBloodGroup} · {bloodRequest.hospitalName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close blood chat"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Coordination Actions */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleShareHospitalLocation()}
              className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/60 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-[11px] font-semibold hover:bg-red-100 dark:hover:bg-red-950/50 inline-flex items-center gap-1"
            >
              <MapPin size={12} /> Share Hospital Location
            </button>

            {!isRequester && (
              <button
                type="button"
                disabled={sending}
                onClick={() => void handleConfirmAvailability()}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 inline-flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Confirm Availability
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowContactSharePrompt((p) => !p)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold hover:border-red-300 inline-flex items-center gap-1"
            >
              <Phone size={12} /> Share Contact
            </button>
          </div>

          {/* Optional Contact Consent Prompt */}
          {showContactSharePrompt && (
            <div className="px-4 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 space-y-2">
              <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                Permission-based Contact Sharing: Only share your phone number if you consent to direct calling with {partnerName}.
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={contactNumberInput}
                  onChange={(e) => setContactNumberInput(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs"
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void handleShareContact()}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                >
                  Confirm & Share
                </button>
              </div>
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-50/40 dark:bg-slate-950/30">
            {threadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Secure Blood Coordination Chat
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Coordinate blood bank floor, arrival timing, and donor screening details with {partnerName}.
                </p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isMe = msg.senderId === uid;
                const isReadByPartner = (msg.readBy || []).includes(partnerId);
                return (
                  <div
                    key={msg.id}
                    className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm space-y-1.5',
                        isMe
                          ? 'bg-red-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                      )}
                    >
                      {!isMe && (
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {msg.senderName}
                        </p>
                      )}

                      {msg.messageType === 'hospital_location' && (
                        <div
                          className={cn(
                            'p-2.5 rounded-xl border text-xs space-y-1',
                            isMe
                              ? 'bg-red-700/60 border-red-400/40 text-white'
                              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-slate-800 dark:text-slate-200'
                          )}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <MapPin size={13} />
                            <span>{msg.hospitalName || bloodRequest.hospitalName}</span>
                          </div>
                          <p className="text-[11px] opacity-90">{msg.hospitalAddress}</p>
                          {typeof msg.latitude === 'number' && typeof msg.longitude === 'number' && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${msg.latitude}&mlon=${msg.longitude}#map=15/${msg.latitude}/${msg.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-[11px] underline font-semibold"
                            >
                              View Pin ({msg.latitude.toFixed(4)}, {msg.longitude.toFixed(4)})
                            </a>
                          )}
                        </div>
                      )}

                      {msg.messageType === 'availability_confirm' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/20 text-[11px] font-bold">
                          <CheckCircle2 size={13} /> Availability Confirmed
                        </div>
                      )}

                      {msg.messageType === 'contact_share' && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-[11px] font-bold">
                          <Phone size={13} /> Contact Shared With Consent
                        </div>
                      )}

                      <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 tabular-nums">
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <span className="inline-flex items-center gap-0.5 ml-1">
                          {isReadByPartner ? (
                            <>
                              <CheckCheck size={12} className="text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Read</span>
                            </>
                          ) : (
                            <>
                              <Check size={12} />
                              <span>Sent</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="px-5 py-2 bg-red-50 dark:bg-red-950/50 text-xs text-red-600 dark:text-red-300 border-t border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSendText}
            className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              maxLength={1000}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${partnerName}...`}
              aria-label="Type blood coordination message"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/35"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
