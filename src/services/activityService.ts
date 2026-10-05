import { ImageSourcePropType } from 'react-native';

export type FundingMode = 'FULL_PREPAYMENT' | 'DEPOSIT';
export type ApprovalRule = 'MAJORITY' | 'TWO_THIRDS' | 'ALL';

export type ActivityFinancialConfig = {
  fundingMode: FundingMode;
  estimatedCostPerMember?: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  depositAmount?: number;
  paymentDeadline: string;
  treasurerUserId: string;
  approvalThreshold: number;
  approvalRule: ApprovalRule;
};

export type ActivityDraft = {
  name: string;
  category: string;
  description: string;
  cover?: ImageSourcePropType | { uri: string };
  photos: { uri: string }[];
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  scheduleNote: string;
  province: string;
  district: string;
  address: string;
  meetingPoint: string;
  maxParticipants: string;
  requirements: string;
  financialConfig: ActivityFinancialConfig;
};

const localActivityDrafts: (ActivityDraft & { id: string })[] = [];

export function getLocalActivityDrafts() {
  return [...localActivityDrafts];
}

export async function publishActivityDraft(draft: ActivityDraft) {
  // TODO(api): send financialConfig and photos when the backend exposes activity creation.
  // The local adapter intentionally preserves the complete draft for Fund implementation later.
  await Promise.resolve();
  const activity = { id: `local-${Date.now()}`, ...draft, photos: [...draft.photos], financialConfig: { ...draft.financialConfig } };
  localActivityDrafts.push(activity);
  return activity;
}
