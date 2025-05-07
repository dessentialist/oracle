import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useConsoleMessages } from "@/hooks/use-processing";
import { Terminal, X } from "lucide-react";

interface ConsoleViewProps {
  csvFileId: number;
}

export default function ConsoleView({ csvFileId }: ConsoleViewProps) {
  const { messages, clearConsole, isLoading } = useConsoleMessages(csvFileId);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages come in
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Handle manual scroll
  const handleScroll = () => {
    if (!consoleRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
    const isScrolledToBottom = scrollHeight - scrollTop - clientHeight < 10;
    setAutoScroll(isScrolledToBottom);
  };

  // Handle clear console
  const handleClearConsole = () => {
    clearConsole();
  };

  // Get the appropriate text color class based on message type
  const getMessageColor = (type: string): string => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-neutral-300";
    }
  };

  // Format timestamp to local time
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-medium text-neutral-700 flex items-center">
          <Terminal size={16} className="mr-2" />
          Console View
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-neutral-500 hover:text-neutral-700 text-sm"
          onClick={handleClearConsole}
          disabled={isLoading}
        >
          Clear Console
        </Button>
      </div>
      <div
        id="console-view"
        ref={consoleRef}
        className="h-[300px] overflow-y-auto bg-neutral-800 text-neutral-100 rounded-lg p-3 font-mono text-sm"
        onScroll={handleScroll}
      >
        <div id="console-content">
          {messages.length === 0 ? (
            <div className="text-neutral-400">--- System ready ---</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`${getMessageColor(msg.type)} break-words`}>
                <span className="text-neutral-500 text-xs mr-2">[{formatTimestamp(msg.timestamp)}]</span>
                {msg.message}
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-neutral-400 animate-pulse">Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}
