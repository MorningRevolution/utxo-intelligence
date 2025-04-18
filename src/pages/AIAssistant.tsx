import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Shield, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/store/WalletContext";
import { formatBTC } from "@/utils/utxo-utils";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m your Bitcoin UTXO Intelligence AI assistant. I can help you understand your UTXOs, privacy implications, and suggest improvements. How can I help you today?'
  }
];

const getAIResponse = (message: string, walletData: any): Message => {
  const lowerMsg = message.toLowerCase();
  let response = "I'm sorry, I'm just a prototype assistant and don't have enough information to answer that question.";
  
  if (lowerMsg.includes("what is a utxo")) {
    response = "UTXO stands for Unspent Transaction Output. In Bitcoin, UTXOs represent the unspent outputs from previous transactions that can be used as inputs in new transactions. They are the fundamental building blocks of the Bitcoin transaction model.";
  } 
  else if (lowerMsg.includes("how can i improve my privacy")) {
    response = "To improve Bitcoin transaction privacy, you can:\n\n1. Use CoinJoin transactions to break the transaction graph\n2. Avoid address reuse\n3. Use privacy-focused wallets with coin control features\n4. Be cautious about merging UTXOs with different origins\n5. Consider using PayJoin for everyday transactions\n6. Tag your UTXOs and keep coins from different sources separate";
  }
  else if (lowerMsg.includes("what is coinjoin")) {
    response = "CoinJoin is a privacy-enhancing technique where multiple users combine their Bitcoin transactions into a single transaction. This makes it harder to trace the flow of funds since it's not clear which inputs correspond to which outputs. Tools like Wasabi Wallet, Samourai Wallet, and JoinMarket implement CoinJoin protocols.";
  }
  else if (lowerMsg.includes("what is payjoin")) {
    response = "PayJoin (also known as P2EP - Pay-to-EndPoint) is a type of Bitcoin transaction where both the sender and receiver contribute inputs to the transaction. This breaks the common assumption in blockchain analysis that all inputs come from the same party, making transaction graphing more difficult and improving privacy.";
  }
  else if (lowerMsg.includes("show my wallet") || lowerMsg.includes("wallet info") || lowerMsg.includes("balance")) {
    if (walletData) {
      response = `Your wallet "${walletData.name}" contains ${walletData.utxos.length} UTXOs with a total balance of ${formatBTC(walletData.totalBalance)}. `;
      
      const highRisk = walletData.utxos.filter(u => u.privacyRisk === 'high').length;
      const mediumRisk = walletData.utxos.filter(u => u.privacyRisk === 'medium').length;
      const lowRisk = walletData.utxos.filter(u => u.privacyRisk === 'low').length;
      
      response += `\n\nUTXO Privacy Risk Breakdown:\n- ${highRisk} high risk\n- ${mediumRisk} medium risk\n- ${lowRisk} low risk`;
    } else {
      response = "You haven't imported a wallet yet. Please go to the Wallet Import page to load your wallet data.";
    }
  }
  
  return {
    id: Date.now().toString(),
    role: 'assistant',
    content: response,
  };
};

const AIAssistant = () => {
  const { walletData } = useWallet();
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);
    
    setTimeout(() => {
      const aiResponse = getAIResponse(input, walletData);
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessageContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className={i > 0 ? 'mt-2' : ''}>
        {line}
      </p>
    ));
  };

  return (
    <div className="container px-2 md:px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-center mb-6">
        <Bot className="h-8 w-8 text-bitcoin mr-3" />
        <h1 className="text-2xl font-bold text-foreground">AI Assistant</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="bg-dark-card border-dark-border shadow-lg h-[600px] flex flex-col">
            <CardHeader className="border-b border-dark-border">
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 text-bitcoin mr-2" />
                Chat with the UTXO Intelligence Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-bitcoin text-white'
                            : 'bg-dark-lighter text-foreground'
                        }`}
                      >
                        <div className="flex items-center mb-1">
                          {message.role === 'assistant' ? (
                            <Bot className="h-4 w-4 mr-2" />
                          ) : (
                            <User className="h-4 w-4 mr-2" />
                          )}
                          <span className="text-xs font-medium">
                            {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                          </span>
                        </div>
                        <div className="text-sm">
                          {renderMessageContent(message.content)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-dark-lighter text-foreground">
                        <div className="flex items-center">
                          <Bot className="h-4 w-4 mr-2" />
                          <span className="text-xs font-medium">AI Assistant</span>
                        </div>
                        <div className="flex items-center mt-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t border-dark-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your question here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-1">
          <Card className="bg-dark-card border-dark-border shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 text-bitcoin mr-2" />
                Suggested Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                "What is a UTXO?",
                "How can I improve my privacy?",
                "What is CoinJoin?",
                "What is PayJoin?",
                "Show my wallet info",
              ].map((suggestion, i) => (
                <Button 
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-left mb-2"
                  onClick={() => {
                    setInput(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </CardContent>
          </Card>
          
          <Card className="bg-dark-card border-dark-border shadow-lg mt-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 text-bitcoin mr-2" />
                Privacy Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This is a demonstration prototype. In a full implementation, the AI assistant would analyze your UTXO patterns and provide personalized privacy recommendations.
              </p>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                All data processing happens locally in your browser. No information is sent to external servers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
