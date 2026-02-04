"use client"

import { FileTransfer } from "@/lib/types"
import { Progress } from "@/components/ui/progress"
import { 
  File, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Clock,
  Zap
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
    <div className="p-4 bg-card rounded-xl border border-border/50 space-y-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "p-2 rounded-lg shrink-0",
            transfer.direction === 'send' ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
          )}>
            {transfer.direction === 'send' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{transfer.fileName}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatBytes(transfer.fileSize)}</span>
              <span>•</span>
              <span>{transfer.peerName}</span>
            </div>
          </div>
        </div>
        
        <div className="shrink-0">
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          {isFailed && <AlertCircle className="h-5 w-5 text-destructive" />}
          {isActive && <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />}
        </div>
      </div>

      <div className="space-y-1.5">
        <Progress value={transfer.progress} className="h-1.5" />
        <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {formatBytes(transfer.speed)}/s
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {isCompleted ? "Finished" : formatTime(transfer.eta)}
            </span>
          </div>
          <span>{transfer.progress}%</span>
        </div>
      </div>
    </div>
  )
}