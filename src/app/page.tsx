
"use client"

import { useState, useEffect, useRef, useMemo } from 'react';
import { Peer, FileTransfer } from '@/lib/types';
import { PeerCard } from '@/components/peer-card';
import { TransferItem } from '@/components/transfer-item';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
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
  Check,
  Menu,
  X,
  Cloud,
  MessageSquarePlus
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
  updateDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

type ViewType = 'dashboard' | 'files' | 'history' | 'settings';

export default function Home() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<Peer | null>(null);
  const [networkId, setNetworkId] = useState<string>('detecting...');
  const [publicIp, setPublicIp] = useState<string>('0.0.0.0');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Text share state
  const [shareText, setShareText] = useState('');
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  
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
      if (db && deviceId) {
        setDoc(doc(db, 'peers', deviceId), { status: 'offline' }, { merge: true });
      }
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

  // 4. Live Transfers
  const transfersQuery = useMemo(() => {
    if (!db || !deviceId) return null;
    return query(
      collection(db, 'transfers'),
      orderBy('createdAt', 'desc'),
      limit(20)
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
        speed: t.status === 'active' && t.type === 'file' ? 12 * 1024 * 1024 : 0,
        eta: t.status === 'active' && t.type === 'file' ? (100 - t.progress) * 0.2 : 0
      })) as FileTransfer[];
  }, [rawTransfers, deviceId]);

  // Simulated Transfer Progress for Files
  useEffect(() => {
    if (!db) return;
    const interval = setInterval(() => {
      activeTransfers.forEach(t => {
        if (t.status === 'active' && t.senderId === deviceId) {
          if (t.type === 'file') {
            const nextProgress = Math.min(t.progress + 5, 100);
            const nextStatus = nextProgress >= 100 ? 'completed' : 'active';
            updateDoc(doc(db, 'transfers', t.id), {
              progress: nextProgress,
              status: nextStatus
            });
          } else {
            // Text is instant
             updateDoc(doc(db, 'transfers', t.id), {
              progress: 100,
              status: 'completed'
            });
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [db, activeTransfers, deviceId]);

  const handleSelectFiles = () => {
    if (!selectedPeer) {
      toast({
        title: "Select a device",
        description: "Choose a device from the list first.",
        variant: "destructive"
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleOpenTextDialog = () => {
    if (!selectedPeer) {
      toast({
        title: "Select a device",
        description: "Choose a device from the list first.",
        variant: "destructive"
      });
      return;
    }
    setIsTextDialogOpen(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedPeer || !db || !deviceId) return;

    Array.from(files).forEach(file => {
      const transferId = Math.random().toString(36).substr(2, 9);
      const transferRef = doc(db, 'transfers', transferId);
      
      setDoc(transferRef, {
        id: transferId,
        type: 'file',
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
      title: "Sending...",
      description: `Sending ${files.length} file(s) to ${selectedPeer.name}`,
    });
    
    e.target.value = '';
    setSelectedPeer(null);
  };

  const onSendText = () => {
    if (!shareText.trim() || !selectedPeer || !db || !deviceId) return;

    const transferId = Math.random().toString(36).substr(2, 9);
    const transferRef = doc(db, 'transfers', transferId);
    
    setDoc(transferRef, {
      id: transferId,
      type: 'text',
      fileName: 'Text Snippet',
      fileSize: shareText.length,
      textContent: shareText,
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

    toast({
      title: "Text Sent",
      description: `Message sent to ${selectedPeer.name}`,
    });
    
    setShareText('');
    setIsTextDialogOpen(false);
    setSelectedPeer(null);
  };

  const handleUpdateName = () => {
    localStorage.setItem('rapidshare_device_name', deviceName);
    setIsEditingName(false);
    toast({ title: "Name Updated", description: `You are now known as ${deviceName}` });
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewType, icon: any, label: string }) => (
    <Button 
      variant="ghost" 
      className={cn(
        "w-full justify-start gap-3 rounded-xl transition-all duration-200",
        activeView === view 
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
      onClick={() => {
        setActiveView(view);
        setIsMobileMenuOpen(false);
      }}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Button>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-border flex-col p-8 space-y-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2.5 rounded-2xl text-white shadow-lg shadow-primary/25">
            <Zap className="h-7 w-7 fill-current" />
          </div>
          <span className="text-2xl font-black tracking-tight text-primary">RapidShare</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem view="dashboard" icon={LayoutGrid} label="Dashboard" />
          <NavItem view="files" icon={Files} label="My Transfers" />
          <NavItem view="history" icon={History} label="History" />
          <NavItem view="settings" icon={Settings} label="Settings" />
        </nav>

        <div className="bg-muted/30 rounded-3xl p-6 space-y-5 border border-border/50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">My Identity</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => setActiveView('settings')}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-base font-bold truncate text-foreground">{deviceName}</p>
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              Network Node
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate bg-white p-2 rounded-lg border border-border/30">{publicIp}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 bg-white h-full p-8 flex flex-col shadow-2xl animate-in slide-in-from-left">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-primary" />
                  <span className="font-black text-xl text-primary">RapidShare</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
             </div>
             <nav className="flex-1 space-y-2">
                <NavItem view="dashboard" icon={LayoutGrid} label="Dashboard" />
                <NavItem view="files" icon={Files} label="My Transfers" />
                <NavItem view="history" icon={History} label="History" />
                <NavItem view="settings" icon={Settings} label="Settings" />
             </nav>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        <header className="h-20 lg:h-24 flex items-center justify-between px-6 lg:px-12 shrink-0 bg-white/50 backdrop-blur-md lg:bg-transparent border-b lg:border-none">
          <div className="flex items-center gap-4 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary fill-current" />
              <span className="font-black text-xl text-primary">RS</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center bg-white rounded-2xl border border-border/50 px-5 py-3 w-full max-w-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <input 
              type="text" 
              placeholder="Quick search devices or active transfers..." 
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center font-bold shadow-lg shadow-primary/20">
               {deviceId?.substring(deviceId.length - 2).toUpperCase() || '??'}
             </div>
          </div>
        </header>

        <ScrollArea className="flex-1 px-6 lg:px-12 py-6">
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Conditional Views */}
            {activeView === 'dashboard' && (
              <div className="space-y-12 pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight font-headline">Quick Share</h1>
                    <p className="text-muted-foreground text-lg">Send files or text snippets to any device nearby.</p>
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
                      variant="outline"
                      className="rounded-2xl px-6 shadow-sm gap-3 h-16 text-lg font-bold border-2"
                      onClick={handleOpenTextDialog}
                    >
                      <MessageSquarePlus className="h-6 w-6" />
                      Send Text
                    </Button>
                    <Button 
                      size="lg" 
                      className="rounded-2xl px-8 shadow-xl shadow-primary/25 gap-3 h-16 text-lg font-bold"
                      onClick={handleSelectFiles}
                    >
                      <Plus className="h-6 w-6" />
                      Send Files
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold flex items-center gap-3">
                        <MonitorSmartphone className="h-6 w-6 text-primary" />
                        Available Nodes
                      </h2>
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-100">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Scanning Live
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {nearbyPeers.map(peer => (
                        <PeerCard 
                          key={peer.id} 
                          peer={peer} 
                          onSelect={(p) => {
                            setSelectedPeer(p);
                            toast({ title: `Target: ${p.name}`, description: "Now click 'Send Files' or 'Send Text'." });
                          }} 
                        />
                      ))}
                      {nearbyPeers.length === 0 && (
                        <div className="col-span-full border-2 border-dashed border-border/50 rounded-3xl p-20 flex flex-col items-center justify-center text-center bg-white/40">
                          <div className="bg-white p-6 rounded-3xl shadow-sm mb-6">
                            <Wifi className="h-12 w-12 text-muted-foreground animate-pulse" />
                          </div>
                          <p className="text-xl font-bold">Waiting for Peers</p>
                          <p className="text-muted-foreground mt-2 max-w-sm">
                            Invite friends to this page on the same network to start sharing.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <History className="h-6 w-6 text-primary" />
                      Active Stream
                    </h2>
                    
                    <div className="space-y-5">
                      {activeTransfers.filter(t => t.status === 'active').length > 0 ? (
                        activeTransfers.filter(t => t.status === 'active').map(transfer => (
                          <TransferItem key={transfer.id} transfer={transfer} />
                        ))
                      ) : (
                        <div className="bg-white rounded-3xl p-12 border border-border/50 text-center space-y-4 shadow-sm">
                          <div className="bg-muted/50 h-20 w-20 rounded-3xl flex items-center justify-center mx-auto text-muted-foreground">
                            <Cloud className="h-10 w-10" />
                          </div>
                          <p className="text-lg font-bold">Idle</p>
                          <p className="text-sm text-muted-foreground">No data is currently moving through your node.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'files' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-3xl font-black">Transfer Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTransfers.length > 0 ? (
                    activeTransfers.map(transfer => (
                      <TransferItem key={transfer.id} transfer={transfer} />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                       <Files className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                       <p className="text-xl font-bold">No transfer activity yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'history' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-3xl font-black">History Archive</h2>
                <div className="bg-white rounded-3xl border border-border/50 overflow-hidden shadow-sm">
                  <div className="p-8">
                    {activeTransfers.filter(t => t.status === 'completed').length > 0 ? (
                      <div className="space-y-4">
                        {activeTransfers.filter(t => t.status === 'completed').map(t => (
                          <div key={t.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/30">
                            <div className="flex items-center gap-4">
                              <div className="bg-primary/10 p-3 rounded-xl">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">{t.fileName}</p>
                                <p className="text-xs text-muted-foreground">Shared with {t.peerName}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Success</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-10">Archive is currently empty.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-3xl font-black mb-10">Configuration</h2>
                <div className="bg-white rounded-3xl border border-border/50 p-8 space-y-10 shadow-sm">
                  <div className="space-y-4">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Device Persona</label>
                    <div className="flex gap-4">
                      <Input 
                        value={deviceName} 
                        onChange={(e) => setDeviceName(e.target.value)} 
                        className="h-14 rounded-2xl px-6 text-lg font-bold"
                        placeholder="Choose a name..."
                      />
                      <Button size="lg" className="h-14 rounded-2xl px-8" onClick={handleUpdateName}>
                        Update
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">This name is visible to everyone on your current network node.</p>
                  </div>

                  <div className="space-y-4 pt-10 border-t border-border/50">
                     <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Network Diagnostics</label>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-muted/30 rounded-2xl border border-border/30">
                           <p className="text-[10px] font-bold text-muted-foreground mb-1">NODE ID</p>
                           <p className="font-mono text-xs font-bold">{deviceId}</p>
                        </div>
                        <div className="p-6 bg-muted/30 rounded-2xl border border-border/30">
                           <p className="text-[10px] font-bold text-muted-foreground mb-1">LOCAL CLUSTER</p>
                           <p className="font-mono text-xs font-bold">{networkId}</p>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </main>

      {/* Send Text Dialog */}
      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Send Text Snippet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              To: <span className="font-bold text-foreground">{selectedPeer?.name}</span>
            </p>
            <Textarea 
              placeholder="Paste your text or type a message here..." 
              className="min-h-[150px] rounded-2xl p-4 text-base"
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
            />
          </div>
          <DialogFooter className="flex gap-3 sm:justify-end">
            <Button variant="ghost" className="rounded-xl px-6" onClick={() => setIsTextDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl px-8 font-bold" onClick={onSendText} disabled={!shareText.trim()}>
              Send Snippet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
