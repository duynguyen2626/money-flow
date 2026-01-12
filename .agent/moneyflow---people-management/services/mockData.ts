
import { Member, Account, Transaction, DebtPeriod } from '../types';

const mockTransactions: Transaction[] = [
  {
    id: 't1',
    date: '06.01',
    time: '14:11',
    note: 'Cream',
    sourceIcon: 'https://img.icons8.com/color/48/000000/lazada.png',
    sourceName: 'Lazada',
    flowEntity: { from: 'mMsb Online', details: '25-12 to 24-01' },
    value: 1500000,
    discount: '-8%',
    category: 'Shopping',
    type: 'Lend'
  },
  {
    id: 't2',
    date: '03.01',
    time: '00:00',
    note: 'Buffet sáng',
    sourceIcon: 'https://img.icons8.com/ios-filled/50/000000/restaurant.png',
    sourceName: 'Food',
    flowEntity: { from: 'Vpbank Lady', details: '20-12 to 19-01' },
    value: 791532,
    category: 'Shopping',
    type: 'Lend'
  }
];

const mockHistory: DebtPeriod[] = [
  {
    month: 'DEC 25',
    total: 217158586,
    paid: 215000000,
    remains: 2622590,
    isPaid: false,
    status: 'Active',
    transactions: mockTransactions
  },
  {
    month: 'NOV 25',
    total: 15000000,
    paid: 15000000,
    remains: 0,
    isPaid: true,
    status: 'Settled',
    transactions: []
  },
  {
    month: 'OCT 25',
    total: 12000000,
    paid: 12000000,
    remains: 0,
    isPaid: true,
    status: 'Settled',
    transactions: []
  }
];

export const mockMembers: Member[] = [
  {
    id: '1',
    name: 'Tuan',
    initials: 'TU',
    services: [{ type: 'Youtube', count: 1 }],
    currentDebt: {
      month: 'JAN 26',
      total: 8619199,
      paid: 0,
      remains: 8619199,
      isPaid: false,
      status: 'Active',
      transactions: mockTransactions
    },
    periods: mockHistory,
    extraPeriodsCount: 2,
    linkedSheet: 'Sheet 1',
    scriptType: 'Script',
    status: 'warning'
  },
  {
    id: '2',
    name: 'My',
    initials: 'MY',
    services: [{ type: 'iCloud', count: 1 }],
    currentDebt: {
      month: 'JAN 26',
      total: 35041000,
      paid: 0,
      remains: 35041000,
      isPaid: false,
      status: 'Active',
      transactions: []
    },
    periods: [
      {
        month: 'DEC 25',
        total: 5000000,
        paid: 5000000,
        remains: 0,
        isPaid: true,
        status: 'Settled'
      }
    ],
    extraPeriodsCount: 0,
    linkedSheet: 'Sheet 1',
    scriptType: 'Script',
    status: 'warning'
  },
  {
    id: '3',
    name: 'Lâm',
    initials: 'LA',
    services: [
      { type: 'Youtube', count: 2 },
      { type: 'iCloud', count: 2 }
    ],
    currentDebt: {
      month: 'JAN 26',
      total: 1944082,
      paid: 0,
      remains: 1944082,
      isPaid: false,
      status: 'Active'
    },
    extraPeriodsCount: 1,
    linkedSheet: 'Sheet 2',
    scriptType: 'Script',
    status: 'warning'
  }
];

export const mockAccounts: Account[] = [
  {
    id: 'acc1',
    name: 'Bidv Cashback',
    type: 'Credit',
    balance: 40388800,
    limit: 45000000,
    needToSpend: 0,
    spent: 600000,
    daysLeft: 9,
    dueDate: 'Jan 5',
    billingCycle: 'Month Cycle',
    status: 'urgent',
    isSecured: true,
    cardBrand: 'bidv'
  }
];
