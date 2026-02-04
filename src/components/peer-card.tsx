
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Peer } from "@/lib/types"
import { Laptop, Smartphone, Monitor, ChevronRight, Activity } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PeerCardProps {
  peer: Peer;
  onSelect: (peer: Peer) => void;
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

export function PeerCard({ peer, onSelect }: PeerCardProps) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-none ring-1 ring-border/50 hover:ring-primary/40 overflow-hidden bg-white/80 backdrop-blur-sm"
      onClick={() => onSelect(peer)}
    >
      <CardContent className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="bg-muted/50 p-4 rounded-2xl group-hover:bg-primary/5 transition-colors duration-300">
            <DeviceIcon type={peer.deviceType} />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors">{peer.name}</h3>
            <div className="flex items-center gap-2">
               <p className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-0.5 rounded-md">{peer.ip}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-emerald-500/20 bg-emerald-500/5 text-emerald-600 px-3 py-1">
              Connect
            </Badge>
          </div>
          <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
        </div>
      </CardContent>
    </Card>
  )
}
