
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Peer } from "@/lib/types"
import { Laptop, Smartphone, Monitor, ChevronRight, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PeerCardProps {
  peer: Peer;
  onSelect: (peer: Peer) => void;
  selected?: boolean;
}

const DeviceIcon = ({ type }: { type: Peer['deviceType'] }) => {
  switch (type) {
    case 'android':
    case 'ios':
      return <Smartphone className="h-10 w-10 text-secondary" />;
    case 'windows':
    case 'linux':
    case 'mac':
    default:
      return <Laptop className="h-10 w-10 text-primary" />;
  }
}

export function PeerCard({ peer, onSelect, selected }: PeerCardProps) {
  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-xl transition-all duration-300 border-none ring-1 overflow-hidden bg-white/80 backdrop-blur-sm relative",
        selected ? "ring-primary ring-2 bg-primary/5 shadow-lg shadow-primary/10" : "ring-border/50 hover:ring-primary/40"
      )}
      onClick={() => onSelect(peer)}
    >
      {selected && (
        <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-lg animate-in zoom-in duration-300">
          <Check className="h-4 w-4 stroke-[3]" />
        </div>
      )}
      
      <CardContent className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className={cn(
            "p-4 rounded-2xl transition-colors duration-300",
            selected ? "bg-primary/20" : "bg-muted/50 group-hover:bg-primary/5"
          )}>
            <DeviceIcon type={peer.deviceType} />
          </div>
          <div>
            <h3 className={cn(
              "font-bold text-base sm:text-lg transition-colors",
              selected ? "text-primary" : "text-foreground group-hover:text-primary"
            )}>
              {peer.name}
            </h3>
            <div className="flex items-center gap-2">
               <p className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md">{peer.ip}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <Badge variant="outline" className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-3 py-1",
              selected ? "border-primary bg-primary text-white" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-600"
            )}>
              {selected ? "Selected" : "Add Target"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
