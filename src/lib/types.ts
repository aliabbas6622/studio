export type PeerStatus = 'online' | 'offline';

export interface Peer {
  id: string;
  name: string;
  ip: string;
  deviceType: 'android' | 'windows' | 'mac' | 'ios' | 'linux';
  lastSeen: Date;
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
  startTime: Date;
}