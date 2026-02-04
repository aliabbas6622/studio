
"use client"

import { useState, useEffect, useRef, useMemo } from 'react';
import { Peer, FileTransfer } from '@/lib/types';
import { PeerCard } from '@/components/peer-card';
import { TransferItem } from '@/components/transfer-item';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Wifi, 
  Plus, 
  Settings, 
  Zap, 
  LayoutGrid, 
  History, 
  Files,
  Search,
  MonitorSmartphone
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  useFirestore, 
  useCollection 
} from '@/firebase';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where
} from 'firebase/firestore';

export default function Home() {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [networkId, setNetworkId] = useState<string>('detecting...');
  const [publicIp, setPublicIp] = useState<string>('0.0.0.0');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();

  // 1. Initialize Device ID & Network Detection
  useEffect(() => {
    // Persistent Device ID
    let id = localStorage.getItem('rapidshare_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('rapidshare_device_id', id);
    }
    setDeviceId(id);

    // Detect "Network" (Simplified using public IP grouping)
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => {
        setPublicIp(data.ip);
        setNetworkId(data.ip.replace(/\./g, '-'));
      })
      .catch(() => {
        setNetworkId('local-dev');
        setPublicIp('127.0.0.1');
      });
  }, []);

  // 2. Register Presence
  useEffect(() => {
    if (!db || !deviceId || networkId === 'detecting...') return;

    const deviceType = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' :
                     /Android/i.test(navigator.userAgent) ? 'android' :
                     /Mac/i.test(navigator.userAgent) ? 'mac' :
                     /Win/i.test(navigator.userAgent) ? 'windows' : 'linux';

    const peerRef = doc(db, 'peers', deviceId);
    
    const updatePresence = () => {
      setDoc(peerRef, {
        id: deviceId,
        name: `${deviceType.toUpperCase()} User`,
        ip: publicIp,
        networkId: networkId,
        deviceType: deviceType,
        lastSeen: serverTimestamp(),
        status: 'online'
      }, { merge: true });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [db, deviceId, networkId, publicIp]);

  // 3. Discover Peers on same network
  const peersQuery = useMemo(() => {
    if (!db || networkId === 'detecting...') return null;
    return query(
      collection(db, 'peers'), 
      where('networkId', '==', networkId),
      where('status', '==', 'online')
    );
  }, [db, networkId]);

  const { data: allPeers } = useCollection(peersQuery);
  const nearbyPeers = (allPeers || []).filter(p => p.id !== deviceId) as Peer[];

  // Simulate progress updates for active transfers
  useEffect(() => {
    const timer = setInterval(() => {
      setTransfers(prev => prev.map(t => {
        if (t.status !== 'active') return t;
        const nextProgress = Math.min(t.progress + (Math.random() * 5), 100);
        const nextStatus = nextProgress >= 100 ? 'completed' : 'active';
        return {
          ...t,
          progress: Math.floor(nextProgress),
          status: nextStatus,
          speed: nextStatus === 'completed' ? 0 : 15 * 1024 * 1024 + (Math.random() * 5 * 1024 * 1024),
          eta: nextStatus === 'completed' ? 0 : Math.max(0, (100 - nextProgress) * 0.5)
        };
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectFiles = () => {
    if (!selectedPeer) {
      toast({
        title: "Select a device first",
        description: "Please tap on a device from the list before selecting files.",
        variant: "destructive"
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedPeer) return;

    const newTransfers: FileTransfer[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'active',
      direction: 'send',
      peerName: selectedPeer.name,
      startTime: new Date()
    }));

    setTransfers(prev => [...newTransfers, ...prev]);
    toast({
      title: "Transfer Started",
      description: `Sending ${files.length} file(s) to ${selectedPeer.name}`,
    });
    
    e.target.value = '';
    setSelectedPeer(null);
  };

  const handlePeerSelect = (peer: Peer) => {
    setSelectedPeer(peer);
    toast({
      title: `Selected ${peer.name}`,
      description: "Now click 'Send Files' to start transferring.",
    });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-border flex-col p-6 space-y-8 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-primary p-2 rounded-xl text-white">
            <Zap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">RapidShare</span>
        </div>

        <nav className="flex-1 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-primary/5 text-primary">
            <LayoutGrid className="h-5 w-5" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <Files className="h-5 w-5" />
            My Files
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <History className="h-5 w-5" />
            History
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </nav>

        <div className="bg-muted/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground mb-3">
            <Wifi className="h-3 w-3 text-secondary animate-pulse" />
            Network: {networkId}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Grouped by Public IP</p>
            <p className="text-[10px] text-muted-foreground font-mono">{publicIp}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-16 md:h-20 bg-white md:bg-transparent border-b md:border-none flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">RapidShare</span>
          </div>
          
          <div className="hidden md:flex items-center bg-white rounded-full border border-border px-4 py-2 w-full max-w-md shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <input 
              type="text" 
              placeholder="Search devices or files..." 
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold">
               {deviceId?.substring(deviceId.length - 2).toUpperCase() || '??'}
             </div>
          </div>
        </header>

        <ScrollArea className="flex-1 p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-10">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 font-headline">Fast Local Transfer</h1>
                <p className="text-muted-foreground">Devices on your current network (IP: {publicIp}) will appear here.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  onChange={onFileChange} 
                  className="hidden" 
                />
                <Button 
                  size="lg" 
                  className="rounded-xl px-8 shadow-lg shadow-primary/20 gap-2 h-14"
                  onClick={handleSelectFiles}
                >
                  <Plus className="h-5 w-5" />
                  Send Files
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MonitorSmartphone className="h-5 w-5 text-primary" />
                    Devices Nearby
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Scanning network...
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyPeers.map(peer => (
                    <PeerCard 
                      key={peer.id} 
                      peer={peer} 
                      onSelect={handlePeerSelect} 
                    />
                  ))}
                  {nearbyPeers.length === 0 && (
                    <div className="col-span-full border-2 border-dashed border-border/60 rounded-xl p-12 flex flex-col items-center justify-center text-center opacity-60 bg-white/50">
                      <Search className="h-10 w-10 mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">No other devices found</p>
                      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        Open this page on another device with the same public IP to see them here.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Recent Transfers
                </h2>
                
                <div className="space-y-4">
                  {transfers.length > 0 ? (
                    transfers.map(transfer => (
                      <TransferItem key={transfer.id} transfer={transfer} />
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl p-10 border border-border/50 text-center space-y-3">
                      <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                        <Files className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-medium">No active transfers</p>
                      <p className="text-xs text-muted-foreground">Select a device and choose files to start</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
