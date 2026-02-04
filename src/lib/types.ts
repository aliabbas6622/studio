export type PeerStatus = 'online' | 'offline';

export interface Peer {
  id: string;
  name: string;
  ip: string;
  networkId: string;
  deviceType: 'android' | 'windows' | 'mac' | 'ios' | 'linux';
  lastSeen: any; // Firestore Timestamp
  status: PeerStatus;
}

export type TransferStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number; // in bytes
  progress: number; // 0-100
  speed: number; // in bytes per second
  eta: number; // in seconds
  status: TransferStatus;
  direction: 'send' | 'receive';
  peerName: string;
  startTime: any; // Date or Timestamp
}
