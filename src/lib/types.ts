
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
  fileSize: number;
  progress: number;
  status: TransferStatus;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  createdAt: any;
  // Local UI specific fields
  speed?: number;
  eta?: number;
  direction?: 'send' | 'receive';
  peerName?: string;
}
