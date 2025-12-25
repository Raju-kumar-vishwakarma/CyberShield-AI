import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge-custom";
import {
  MessageSquare,
  Send,
  Lock,
  Shield,
  Clock,
  Bot,
  Trash2,
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCheck,
  Paperclip,
  Image,
  File,
  X,
  Timer,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAIChat } from "@/hooks/useAIChat";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const SecureChat = () => {
  const { messages, isLoading, isSending, sendMessage, clearChat } = useAIChat();
  const [newMessage, setNewMessage] = useState("");
  const [autoDelete, setAutoDelete] = useState(false);
  const [messageExpiry, setMessageExpiry] = useState<number | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-delete timer effect
  useEffect(() => {
    if (autoDelete && messages.length > 0) {
      const timer = setTimeout(() => {
        clearChat();
        toast({
          title: "Messages Cleared",
          description: "Auto-delete triggered after 5 minutes of inactivity",
        });
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearTimeout(timer);
    }
  }, [autoDelete, messages, clearChat, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageToSend = newMessage;
    setNewMessage("");
    setAttachedFile(null);
    
    if (attachedFile) {
      toast({
        title: "File Attached",
        description: `${attachedFile.name} would be encrypted and sent (demo mode)`,
      });
    }
    
    await sendMessage(messageToSend);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setAttachedFile(file);
      toast({
        title: "File Ready",
        description: `${file.name} attached`,
      });
    }
  };

  const quickPrompts = [
    "How can I protect myself from phishing?",
    "What is a firewall?",
    "Explain ransomware attacks",
    "Tips for strong passwords"
  ];

  const expiryOptions = [
    { label: "Never", value: null },
    { label: "1 hour", value: 60 },
    { label: "24 hours", value: 1440 },
    { label: "7 days", value: 10080 },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl lg:text-3xl font-mono font-bold text-foreground mb-2">
              CyberGuard AI Assistant
            </h1>
            <p className="text-muted-foreground">
              AI-powered cybersecurity assistant with end-to-end encryption
            </p>
          </div>
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono text-primary">AI Powered</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          {/* Chat Area */}
          <Card variant="cyber" className="flex flex-col animate-fade-in">
            {/* Chat Header */}
            <CardHeader className="border-b border-border/50 flex-shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card animate-pulse" />
                  </div>
                  <div>
                    <p className="font-mono text-foreground flex items-center gap-2">
                      CyberGuard AI
                      <Sparkles className="h-4 w-4 text-primary" />
                    </p>
                    <p className="text-xs text-success">Online • Ready to help</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Message Expiry */}
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={messageExpiry?.toString() || ""}
                      onChange={(e) => setMessageExpiry(e.target.value ? Number(e.target.value) : null)}
                      className="text-xs bg-secondary/50 border border-border/50 rounded px-2 py-1 text-foreground"
                    >
                      {expiryOptions.map((opt) => (
                        <option key={opt.label} value={opt.value?.toString() || ""}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Auto-delete */}
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">Auto-delete</span>
                    <Switch checked={autoDelete} onCheckedChange={setAutoDelete} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearChat}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 rounded-full bg-primary/10 mb-4">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="font-mono text-lg text-foreground mb-2">
                    Hello! I'm CyberGuard AI 👋
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    I'm here to help you with cybersecurity questions. Ask me about threats, 
                    best practices, or how to stay safe online!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setNewMessage(prompt)}
                        className="text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.is_ai ? "justify-start" : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] p-4 rounded-2xl",
                          message.is_ai
                            ? "bg-secondary/50 border border-primary/30 text-foreground rounded-bl-md"
                            : "bg-primary text-primary-foreground rounded-br-md"
                        )}
                      >
                        {message.is_ai && (
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="h-4 w-4 text-primary" />
                            <span className="text-xs font-mono text-primary">CyberGuard AI</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className={cn(
                          "flex items-center gap-2 mt-2 text-xs",
                          message.is_ai ? "text-muted-foreground" : "text-primary-foreground/70"
                        )}>
                          <Clock className="h-3 w-3" />
                          <span className="font-mono">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                          <Lock className="h-3 w-3" />
                          {/* Read Receipt for user messages */}
                          {!message.is_ai && (
                            <CheckCheck className="h-3 w-3 text-success" />
                          )}
                          {/* Expiry indicator */}
                          {messageExpiry && (
                            <span className="text-warning flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              Expires
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-secondary/50 border border-primary/30 rounded-2xl rounded-bl-md p-4">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary" />
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t border-border/50 flex-shrink-0">
              {/* Attached File Preview */}
              {attachedFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-secondary/30 rounded-lg border border-border/50">
                  <File className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground flex-1 truncate">{attachedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(attachedFile.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ask CyberGuard AI about security..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button type="submit" disabled={!newMessage.trim() || isSending}>
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {!isSending && "Send"}
                </Button>
              </form>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Shield className="h-3 w-3 text-success" />
                <span className="font-mono">Powered by AI • End-to-end encrypted</span>
                {attachedFile && (
                  <Badge variant="info" className="text-xs ml-auto">
                    <Paperclip className="h-3 w-3 mr-1" />
                    File attached
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SecureChat;
