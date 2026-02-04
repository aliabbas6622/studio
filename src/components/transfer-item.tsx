
"use client"

import { FileTransfer } from "@/lib/types"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Zap,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TransferItemProps {
  transfer: FileTransfer;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds: number) => {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

export function TransferItem({ transfer }: TransferItemProps) {
  const isCompleted = transfer.status === 'completed';
  const isFailed = transfer.status === 'failed';
  const isActive = transfer.status === 'active';

  return (
    <div className="p-6 bg-white rounded-3xl border border-border/40 space-y-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            "p-3 rounded-2xl shrink-0 shadow-sm",
            transfer.direction === 'send' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
          )}>
            {transfer.direction === 'send' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm sm:text-base truncate text-foreground">{transfer.fileName}</h4>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mt-1">
              <span className="bg-muted/50 px-2 py-0.5 rounded-md">{formatBytes(transfer.fileSize)}</span>
              <span className="opacity-40">•</span>
              <span className="truncate">{transfer.peerName}</span>
            </div>
          </div>
        </div>
        
        <div className="shrink-0 pt-1">
          {isCompleted && (
            <div className="bg-emerald-50 p-1.5 rounded-full">
               <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            </div>
          )}
          {isFailed && <AlertCircle className="h-6 w-6 text-destructive" />}
          {isActive && (
            <div className="relative h-6 w-6">
               <div className="animate-spin h-6 w-6 border-3 border-primary/20 border-t-primary rounded-full" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Progress value={transfer.progress} className="h-2 rounded-full bg-muted/40" />
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-primary/80">
              <Zap className="h-3.5 w-3.5 fill-current" />
              {formatBytes(transfer.speed || 0)}/s
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {isCompleted ? "Completed" : formatTime(transfer.eta || 0)}
            </span>
          </div>
          <span className={cn(
            "px-2 py-0.5 rounded-md",
            isCompleted ? "text-emerald-600 bg-emerald-50" : "text-primary bg-primary/5"
          )}>{transfer.progress}%</span>
        </div>
      </div>
    </div>
  )
}
