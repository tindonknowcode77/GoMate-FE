import { api, post } from './api';

export type Payment = {
  id: string;
  orderCode: string;
  userId: string;
  userName?: string;
  type: 'activity_deposit' | 'activity_fee' | 'plus_subscription' | 'wallet_topup';
  activityId?: string;
  activityTitle?: string;
  amount: number;
  description: string;
  bank: {
    bankId: string;
    bankBin?: string;
    accountNo: string;
    accountName: string;
  };
  qrPayload: string;
  qrImageUrl: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  createdAt: string;
  paidAt?: string | null;
  expiresAt: string;
};

export type PaymentStatus = {
  id: string;
  orderCode: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  amount: number;
  paidAt?: string | null;
};

export type ActivityPaymentInfo = {
  activityId: string;
  activityTitle: string;
  depositRequired: boolean;
  depositAmount: number;
  isPaid: boolean;
  receipt?: {
    userId: string;
    status: 'paid' | 'pending';
    amount: number;
    paidAt?: string;
    method?: string;
  } | null;
  pendingPayment?: Payment | null;
  bankInfo?: {
    bankId: string;
    accountNo: string;
    accountName: string;
  };
};

export async function createQrPayment(data: {
  type?: 'activity_deposit' | 'activity_fee' | 'plus_subscription' | 'wallet_topup';
  activityId?: string;
  amount?: number;
}): Promise<{ payment: Payment }> {
  return post<{ payment: Payment }>('/payments/create-qr', data);
}

export async function getPayment(id: string): Promise<{ payment: Payment }> {
  return api<{ payment: Payment }>(`/payments/${id}`);
}

export async function getPaymentStatus(id: string): Promise<PaymentStatus> {
  return api<PaymentStatus>(`/payments/${id}/status`);
}

export async function confirmPayment(id: string): Promise<{ message: string; payment: Payment }> {
  return post<{ message: string; payment: Payment }>(`/payments/${id}/confirm`, {});
}

export async function getActivityPaymentInfo(activityId: string): Promise<ActivityPaymentInfo> {
  return api<ActivityPaymentInfo>(`/payments/activity/${activityId}/me`);
}
