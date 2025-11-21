import { TransactionWithDetails } from '@/types/moneyflow.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

interface RecentTransactionsProps {
  transactions: TransactionWithDetails[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <p>Chưa có giao dịch nào.</p>
        <p className="text-sm mt-2">Hãy thêm giao dịch đầu tiên của bạn.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ngày</TableHead>
          <TableHead>Ghi chú</TableHead>
          <TableHead>Danh mục/Tài khoản</TableHead>
          <TableHead>Tag</TableHead>
          <TableHead className="text-right">% Back</TableHead>
          <TableHead className="text-right">Fix Back</TableHead>
          <TableHead className="text-right">Sum Back</TableHead>
          <TableHead className="text-right">Số tiền</TableHead>
          <TableHead className="text-right">Final Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map(txn => {
          const netAmount = txn.amount ?? 0;
          const isLend = netAmount > 0;
          const isCollect = netAmount < 0;
          const amountClass = isCollect
            ? 'text-emerald-700'
            : isLend
              ? 'text-red-500'
              : 'text-slate-600';
          const finalPriceColor = amountClass;
          const originalAmount = typeof txn.original_amount === 'number' ? txn.original_amount : txn.amount;
          const amountValue = currencyFormatter.format(Math.abs(originalAmount ?? 0));
          const percentValue = typeof txn.cashback_share_percent === 'number' ? txn.cashback_share_percent : null;
          const percentBack =
            percentValue && percentValue > 0
              ? `${(percentValue * 100).toLocaleString('vi-VN', {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: percentValue * 100 < 1 ? 1 : 0,
                })}%`
              : '-';
          const fixedValue = typeof txn.cashback_share_fixed === 'number' ? txn.cashback_share_fixed : 0;
          const fixBack = fixedValue > 0 ? currencyFormatter.format(fixedValue) : '-';
          const derivedSumBack = Math.abs(originalAmount ?? 0) * (percentValue ?? 0) + fixedValue;
          const cashbackAmount =
            typeof txn.cashback_share_amount === 'number' && txn.cashback_share_amount > 0
              ? txn.cashback_share_amount
              : derivedSumBack;
          const sumBack = cashbackAmount > 0 ? currencyFormatter.format(cashbackAmount) : '-';
          const finalPrice = Math.abs(netAmount);

          return (
            <TableRow key={txn.id}>
              <TableCell>
                {new Date(txn.occurred_at).toLocaleDateString('vi-VN')}
              </TableCell>
              <TableCell className="font-semibold">{txn.note}</TableCell>
              <TableCell className="text-sm text-gray-500">
                {txn.category_name || txn.account_name || 'Không xác định'}
              </TableCell>
              <TableCell className="text-sm">
                {txn.tag || 'Không có tag'}
              </TableCell>
              <TableCell className="text-right text-sm">{percentBack}</TableCell>
              <TableCell className="text-right text-sm">{fixBack}</TableCell>
              <TableCell className="text-right text-sm">{sumBack}</TableCell>
              <TableCell className={`text-right font-semibold ${amountClass}`}>
                {amountValue}
              </TableCell>
              <TableCell className={`text-right font-semibold ${finalPriceColor}`}>
                {currencyFormatter.format(finalPrice)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
