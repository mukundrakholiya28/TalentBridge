import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { Send, Phone, Video, Mic, User, Search } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  type: 'text' | 'voice' | 'video';
  timestamp: string;
  read: boolean;
}

interface Conversation {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export function RecruiterMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateIdFromUrl = searchParams.get('candidateId');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(candidateIdFromUrl);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeCall) {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Get current user id from JWT
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id || '');
      }
    } catch (e) { }
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedCandidate) {
      fetchMessages(selectedCandidate);
    }
  }, [selectedCandidate]);

  const fetchConversations = async () => {
    try {
      const data = await apiClient.get('/messages/conversations');

      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (candidateId: string) => {
    try {
      const data = await apiClient.get(`/messages/${candidateId}`);

      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async (type: 'text' | 'voice' | 'video' = 'text') => {
    if (type === 'text' && !newMessage.trim()) return;
    if (!selectedCandidate) return;

    setSendingMessage(true);

    try {
      const data = await apiClient.post('/messages', {
        receiverId: selectedCandidate,
        content: newMessage,
        type,
      });

      if (data.success) {
        setNewMessage("");
        fetchMessages(selectedCandidate);
        fetchConversations();
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const startVoiceCall = () => {
    setActiveCall('voice');
  };

  const startVideoCall = () => {
    setActiveCall('video');
  };

  const endCall = () => {
    sendMessage(activeCall === 'voice' ? 'voice' : 'video');
    setActiveCall(null);
    toast.success("Call ended");
  };

  const selectedConversation = conversations.find(c => c.candidateId === selectedCandidate);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />

      <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Messages
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.candidateId}
                    onClick={() => setSelectedCandidate(conv.candidateId)}
                    className={`w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${selectedCandidate === conv.candidateId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {conv.candidateName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {conv.candidateName}
                          </h3>
                          {conv.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conv.lastMessage}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {new Date(conv.lastMessageTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-12 px-4">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No conversations yet
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedCandidate && selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center text-white font-semibold">
                      {selectedConversation.candidateName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedConversation.candidateName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedConversation.candidateEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={startVoiceCall}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Voice Call"
                    >
                      <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={startVideoCall}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Video Call"
                    >
                      <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isMine = message.senderName === 'You' || message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMine
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                        >
                          {message.type === 'voice' && (
                            <div className="flex items-center gap-2 mb-1">
                              <Mic className="w-4 h-4" />
                              <span className="text-sm">Voice message</span>
                            </div>
                          )}
                          {message.type === 'video' && (
                            <div className="flex items-center gap-2 mb-1">
                              <Video className="w-4 h-4" />
                              <span className="text-sm">Video call</span>
                            </div>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-6 py-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      onClick={() => setNewMessage(prev => prev + " [OA Link: https://talentbridge.app/oa/random-id] ")}
                      className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      + Supply OA Link
                    </button>
                    <button
                      onClick={() => setNewMessage(prev => prev + " [Interview Link: https://meet.talentbridge.app/interview-id] ")}
                      className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
                    >
                      + Provide Interview Link
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Use the phone and video icons above for voice and video calls
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No conversation selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call Overlay Mock */}
      {activeCall && selectedConversation && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
          {activeCall === 'video' && (
            <div className="absolute inset-0 w-full h-full object-cover opacity-30 select-none pointer-events-none">
              <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=1920" alt="Video Background" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            {activeCall === 'voice' ? (
              <div className="w-32 h-32 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center text-5xl font-bold mb-8 shadow-2xl animate-pulse">
                {selectedConversation.candidateName.charAt(0)}
              </div>
            ) : (
              <div className="w-64 h-48 bg-gray-800 rounded-xl mb-8 overflow-hidden relative shadow-2xl border border-gray-700">
                <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=600" alt="remote candidate" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 text-sm bg-black/50 px-3 py-1 rounded-full">
                  {selectedConversation.candidateName}
                </div>
              </div>
            )}

            <h2 className="text-3xl font-semibold mb-2">{selectedConversation.candidateName}</h2>
            <p className="text-gray-400 mb-12">{activeCall === 'voice' ? 'Voice Call' : 'Video Meeting'} • {formatDuration(callDuration)}</p>

            <div className="flex items-center gap-6">
              <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition">
                <Mic className="w-6 h-6" />
              </button>
              {activeCall === 'video' && (
                <button className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition">
                  <Video className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={endCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              >
                <Phone className="w-6 h-6 rotate-[135deg]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
