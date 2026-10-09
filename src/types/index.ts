export interface User {
  id: number;
  username: string;
  email: string;
  role: 'Visitor' | 'Registered User' | 'Creator' | 'Premium Subscriber' | 'Administrator';
  isEmailVerified: boolean;
  forcePasswordChange: boolean;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  subscribersCount?: number;
  isPremium?: boolean;
  subscriptionExpiresAt?: string;
  subscriptionPlan?: string;
}

export interface Video {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  duration: number;
  access_level: 'free' | 'premium';
  status: 'draft' | 'uploading' | 'processing' | 'pending_review' | 'published' | 'rejected' | 'removed';
  views_count: number;
  likes_count: number;
  created_at: string;
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  creator_id?: number;
  creator_username?: string;
  creator_display_name?: string;
  creator_avatar_url?: string;
  creator_subscribers_count?: number;
  tags?: string[];
  isLiked?: boolean;
  isSaved?: boolean;
  canWatch?: boolean;
  premiumRequired?: boolean;
}

export interface VideoCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  video_count?: number;
}

export interface MembershipPlan {
  id: number;
  name: string;
  duration_months: number;
  price_usd: number;
  price_crypto: number;
  crypto_symbol: string;
  features: string[];
  is_active: boolean;
}

export interface PaymentOrder {
  id: number;
  orderReference: string;
  userId: number;
  planId: number;
  planName?: string;
  durationMonths?: number;
  amountUsd: number;
  amountCrypto: number;
  assetSymbol: string;
  network: string;
  receivingAddress: string;
  status: 'pending' | 'under_verification' | 'confirmed' | 'rejected' | 'expired';
  expiresAt: string;
  transactionHash?: string;
  txStatus?: string;
  confirmations?: number;
  subscriptionId?: number;
  subExpiresAt?: string;
  qrCodeUrl?: string;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface SourceFile {
  id: number;
  video_id: number;
  video_title?: string;
  original_filename: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  file_format: string;
  checksum_sha256: string;
  processing_status: string;
  uploaded_by?: number;
  uploader_username?: string;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  premiumUsers?: number;
  freeUsers?: number;
  activePremiumSubscribers: number;
  onlineNow?: number;
  onlinePremium?: number;
  onlineFree?: number;
  onlineGuests?: number;
  totalVideos: number;
  publishedVideos: number;
  pendingVideoApprovals: number;
  pendingContentReports: number;
  pendingPayments: number;
  confirmedPayments: number;
  expiredSubscriptions: number;
  storageConsumption: string;
  storageBytes: number;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  admin_username: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}
