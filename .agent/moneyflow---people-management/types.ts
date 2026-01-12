
export type ServiceType = 'Youtube' | 'iCloud' | 'Netflix' | 'Spotify';

export interface Service {
  type: ServiceType;
  count: number;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  note: string;
  sourceIcon?: string;
  sourceName: string;
  flowEntity: {
    from: string;
    details: string;
  };
  value: number;
  discount?: string;
  category: string;
  type: 'Lend' | 'Repay';
}

export interface DebtPeriod {
  month: string;
  total: number;
  paid: number;
  remains: number;
  isPaid: boolean;
  transactions?: Transaction[];
  status?: 'Active' | 'Settled';
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  services: Service[];
  currentDebt: DebtPeriod;
  extraPeriodsCount: number;
  linkedSheet?: string;
  scriptType?: 'Script' | 'Manual' | 'None';
  status: 'warning' | 'clean' | 'pending';
  periods?: DebtPeriod[]; // History of periods
}

export interface RewardRule {
  type: 'cashback' | 'points';
  description: string;
  details: string[];
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  limit?: number;
  needToSpend: number;
  spent: number;
  remains?: number;
  daysLeft?: number;
  dueDate?: string;
  billingCycle?: string;
  status: 'urgent' | 'warning' | 'normal';
  cardImage?: string;
  isSecured?: boolean;
  role?: 'Parent' | 'Child';
  parentId?: string;
  groupId?: string;
  rewardRules?: RewardRule;
  cardBrand?: 'vcb' | 'msb' | 'vpbank' | 'bidv' | 'generic';
}
