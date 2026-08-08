import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { DashboardHeader } from "../components/DashboardHeader";
import { Send, Phone, Video, Mic, Building, Search } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";
import { getAuthToken } from "../../utils/authStorage";
import { subscribeUserMessages } from "../../utils/pusherClient";

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
    recruiterId: string;
    recruiterName: string;
    companyName: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
}

export function CandidateMessages() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const recruiterIdFromUrl = searchParams.get('to') || searchParams.get('recruiterId');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedRecruiter, setSelectedRecruiter] = useState<string | null>(recruiterIdFromUrl);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [activeCall, setActiveCall] = useState<'voice' | 'video' | null>(null);
    const [callDuration, setCallDuration] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string>("");

    useEffect(() => {
        let unsub: (() => void) | undefined;
        // Get current user id from token
        try {
            const token = getAuthToken();
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const uid = payload.id || '';
                setCurrentUserId(uid);
                if (uid) {
                    unsub = subscribeUserMessages(uid, (msg: any) => {
                        setMessages(prev => [...prev, msg]);
                        fetchConversations();
                    });
                }
            }
        } catch (e) { }
        fetchConversations();

        return () => {
            if (unsub) unsub();
        };
    }, []);

    useEffect(() => {
        if (selectedRecruiter) {
            fetchMessages(selectedRecruiter);
        }
    }, [selectedRecruiter]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    const fetchConversations = async () => {
        try {
            const data = await apiClient.get('/messages/conversations', true, 30_000);
            if (data.success && data.conversations) {
                // Map backend shape (candidateId/candidateName) to candidate UI shape (recruiterId/recruiterName)
                const mapped = data.conversations.map((c: any) => ({
                    recruiterId: c.candidateId,
                    recruiterName: c.candidateName || "Recruiter",
                    companyName: c.candidateName || "Recruiter",
                    lastMessage: c.lastMessage,
                    lastMessageTime: c.lastMessageTime,
                    unreadCount: c.unreadCount || 0
                }));
                setConversations(mapped);

                // If recruiterIdFromUrl was set and no matching conversation exists, create a placeholder
                if (recruiterIdFromUrl && !mapped.find((c: Conversation) => c.recruiterId === recruiterIdFromUrl)) {
                    setConversations([{
                        recruiterId: recruiterIdFromUrl,
                        recruiterName: "Recruiter",
                        companyName: "Recruiter",
                        lastMessage: "Start a conversation...",
                        lastMessageTime: new Date().toISOString(),
                        unreadCount: 0
                    }, ...mapped]);
                }
            }
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (recruiterId: string) => {
        try {
            const data = await apiClient.get(`/messages/${recruiterId}`, true, 15_000);
            if (data.success) {
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };

    const sendMessageHandler = async (type: 'text' | 'voice' | 'video' = 'text') => {
        if (type === 'text' && !newMessage.trim()) return;
        if (!selectedRecruiter) return;

        const tempMessage: Message = {
            id: `temp_${Date.now()}`,
            senderId: currentUserId,
            senderName: 'You',
            receiverId: selectedRecruiter,
            content: type === 'text' ? newMessage : `[${type} call]`,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Optimistic update – instant UI feedback
        setMessages(prev => [...prev, tempMessage]);
        const contentToSend = newMessage;
        setNewMessage("");
        setSendingMessage(true);

        try {
            const data = await apiClient.post('/messages', {
                receiverId: selectedRecruiter,
                content: contentToSend || `[${type} call]`,
                type,
            });

            if (data.success) {
                // Replace temp message with real one
                setMessages(prev => prev.map(m => 
                    m.id === tempMessage.id && data.message ? data.message : m
                ));
                fetchConversations();
            } else {
                // Remove temp message on failure
                setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
                toast.error("Failed to send message");
            }
        } catch (error) {
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            console.error("Error sending message:", error);
            toast.error("Failed to send message");
        } finally {
            setSendingMessage(false);
        }
    };

    const startVoiceCall = () => setActiveCall('voice');
    const startVideoCall = () => setActiveCall('video');
    const endCall = () => {
        sendMessageHandler(activeCall === 'voice' ? 'voice' : 'video');
        setActiveCall(null);
        toast.success("Call ended");
    };

    const selectedConversation = conversations.find(c => c.recruiterId === selectedRecruiter);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <DashboardHeader />

            <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                <div className="h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex">
                    {/* Conversations List */}
                    <div className={`${selectedRecruiter ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 border-r border-gray-200 dark:border-gray-800 flex-col`}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                Messages
                            </h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search recruiters..."
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
                                        key={conv.recruiterId}
                                        onClick={() => setSelectedRecruiter(conv.recruiterId)}
                                        className={`w-full p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${selectedRecruiter === conv.recruiterId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                                {(conv.recruiterName || "R").charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {conv.recruiterName}
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
                                    <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                                        No conversations yet
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className={`${selectedRecruiter ? 'flex' : 'hidden sm:flex'} flex-1 flex-col`}>
                        {selectedRecruiter ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedRecruiter(null)}
                                            className="sm:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                                            {(selectedConversation?.recruiterName || "R").charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {selectedConversation?.recruiterName || "Recruiter"}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Online
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={startVoiceCall}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="Voice Call"
                                        >
                                            <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                        <button
                                            onClick={startVideoCall}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="Video Call"
                                        >
                                            <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.length === 0 && (
                                        <div className="text-center py-12 text-gray-400">
                                            <p>No messages yet. Say hello!</p>
                                        </div>
                                    )}
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
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessageHandler()}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        />
                                        <button
                                            onClick={() => sendMessageHandler()}
                                            disabled={sendingMessage || !newMessage.trim()}
                                            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Send className="w-4 h-4" />
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        Select a conversation
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Choose a recruiter from the sidebar to start chatting
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Call Overlay */}
            {activeCall && selectedConversation && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-5xl font-bold mb-8 shadow-2xl animate-pulse">
                            {(selectedConversation.recruiterName || "R").charAt(0)}
                        </div>

                        <h2 className="text-3xl font-semibold mb-2">{selectedConversation.recruiterName}</h2>
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
