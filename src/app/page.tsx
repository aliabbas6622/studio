
"use client"

import { useState, useEffect, useRef, useMemo } from 'react';
import { Peer, FileTransfer } from '@/lib/types';
import { PeerCard } from '@/components/peer-card';
import { TransferItem } from '@/components/transfer-item';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Wifi, 
  Plus, 
  Settings, 
  Zap, 
  LayoutGrid, 
  History, 
  Files,
  Search,
  MonitorSmartphone,
  User,
  Check
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
  where,
  deleteDoc,
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function Home() {
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [networkId, setNetworkId] = useState<string>('detecting...');
  const [publicIp, setPublicIp] = useState<string>('0.0.0.0');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();

  // 1. Initialize Device ID & Network Detection
  useEffect(() => {
    let id = localStorage.getItem('rapidshare_device_id');
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('rapidshare_device_id', id);
    }
    setDeviceId(id);

    const savedName = localStorage.getItem('rapidshare_device_name');
    const deviceType = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' :
                     /Android/i.test(navigator.userAgent) ? 'android' :
                     /Mac/i.test(navigator.userAgent) ? 'mac' :
                     /Win/i.test(navigator.userAgent) ? 'windows' : 'linux';
    
    setDeviceName(savedName || `${deviceType.toUpperCase()} User`);

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
        name: deviceName,
        ip: publicIp,
        networkId: networkId,
        deviceType: deviceType,
        lastSeen: serverTimestamp(),
        status: 'online'
      }, { merge: true }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: peerRef.path,
          operation: 'write'
        }));
      });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000);

    return () => {
      clearInterval(interval);
      // Try to set offline on exit
      setDoc(peerRef, { status: 'offline' }, { merge: true });
    };
  }, [db, deviceId, networkId, publicIp, deviceName]);

  // 3. Discover Peers
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

  // 4. Live Transfers (Real-time Simulation)
  const transfersQuery = useMemo(() => {
    if (!db || !deviceId) return null;
    // Show transfers where I am sender OR receiver
    return query(
      collection(db, 'transfers'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [db, deviceId]);

  const { data: rawTransfers } = useCollection(transfersQuery);
  
  const activeTransfers = useMemo(() => {
    if (!rawTransfers || !deviceId) return [];
    return rawTransfers
      .filter(t => t.senderId === deviceId || t.receiverId === deviceId)
      .map(t => ({
        ...t,
        direction: t.senderId === deviceId ? 'send' : 'receive',
        peerName: t.senderId === deviceId ? t.receiverName : t.senderName,
        speed: t.status === 'active' ? 12 * 1024 * 1024 : 0,
        eta: t.status === 'active' ? (100 - t.progress) * 0.2 : 0
      })) as FileTransfer[];
  }, [rawTransfers, deviceId]);

  // Handle transfer simulation updates
  useEffect(() => {
    if (!db) return;
    const interval = setInterval(() => {
      activeTransfers.forEach(t => {
        if (t.status === 'active' && t.senderId === deviceId) {
          const nextProgress = Math.min(t.progress + 5, 100);
          const nextStatus = nextProgress >= 100 ? 'completed' : 'active';
          updateDoc(doc(db, 'transfers', t.id), {
            progress: nextProgress,
            status: nextStatus
          });
        }
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [db, activeTransfers, deviceId]);

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
    if (!files || !selectedPeer || !db || !deviceId) return;

    Array.from(files).forEach(file => {
      const transferId = Math.random().toString(36).substr(2, 9);
      const transferRef = doc(db, 'transfers', transferId);
      
      setDoc(transferRef, {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: 'active',
        senderId: deviceId,
        senderName: deviceName,
        receiverId: selectedPeer.id,
        receiverName: selectedPeer.name,
        createdAt: serverTimestamp()
      }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: transferRef.path,
          operation: 'create'
        }));
      });
    });

    toast({
      title: "Transfer Started",
      description: `Sending ${files.length} file(s) to ${selectedPeer.name}`,
    });
    
    e.target.value = '';
    setSelectedPeer(null);
  };

  const handleUpdateName = () => {
    localStorage.setItem('rapidshare_device_name', deviceName);
    setIsEditingName(false);
    toast({ title: "Name Updated", description: `You are now known as ${deviceName}` });
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

        <div className="bg-muted/50 rounded-2xl p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">My Device</span>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setIsEditingName(true)}>
                <Settings className="h-3 w-3" />
              </Button>
            </div>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input 
                  value={deviceName} 
                  onChange={(e) => setDeviceName(e.target.value)} 
                  className="h-7 text-xs px-2"
                  autoFocus
                />
                <Button size="icon" className="h-7 w-7" onClick={handleUpdateName}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <p className="text-sm font-bold truncate">{deviceName}</p>
            )}
          </div>

          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground mb-1">
              <Wifi className="h-3 w-3 text-secondary animate-pulse" />
              Net: {networkId}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono truncate">{publicIp}</p>
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
                <p className="text-muted-foreground">Devices on your current network will appear here automatically.</p>
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
                    Scanning...
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyPeers.map(peer => (
                    <PeerCard 
                      key={peer.id} 
                      peer={peer} 
                      onSelect={(p) => {
                        setSelectedPeer(p);
                        toast({ title: `Selected ${p.name}`, description: "Click 'Send Files' to transfer." });
                      }} 
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
                  {activeTransfers.length > 0 ? (
                    activeTransfers.map(transfer => (
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
