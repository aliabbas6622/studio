"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Peer } from "@/lib/types"
import { Laptop, Smartphone, Monitor, ShieldCheck, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PeerCardProps {
  peer: Peer;
  onSelect: (peer: Peer) => void;
}

const DeviceIcon = ({ type }: { type: Peer['deviceType'] }) => {
  switch (type) {
    case 'android':
    case 'ios':
      return <Smartphone className="h-8 w-8 text-secondary" />;
    case 'windows':
    case 'linux':
    case 'mac':
    default:
      return <Laptop className="h-8 w-8 text-primary" />;
  }
}

export function PeerCard({ peer, onSelect }: PeerCardProps) {
  return (
    <Card 
      className="group cursor-pointer hover:shadow-md transition-all border-none ring-1 ring-border/50 hover:ring-primary/50 overflow-hidden"
      onClick={() => onSelect(peer)}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-muted p-3 rounded-xl group-hover:bg-primary/5 transition-colors">
            <DeviceIcon type={peer.deviceType} />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">{peer.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{peer.ip}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-2">
            <Badge variant="outline" className="text-[10px] font-normal border-secondary/20 bg-secondary/5 text-secondary">
              Available
            </Badge>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  )
}