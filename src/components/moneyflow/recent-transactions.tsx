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
          <TableHead className="text-right">Số tiền</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map(txn => {
          const amountClass =
            txn.type === 'expense'
              ? 'text-red-600'
              : txn.type === 'income'
              ? 'text-green-600'
              : 'text-slate-600';
          const prefix = txn.type === 'income' ? '+ ' : '';
          const amountValue = currencyFormatter.format(Math.abs(txn.amount));

          return (
            <TableRow key={txn.id}>
              <TableCell>
                {new Date(txn.occurred_at).toLocaleDateString('vi-VN')}
              </TableCell>
              <TableCell className="font-semibold">{txn.note}</TableCell>
              <TableCell className="text-sm text-gray-500">
                {txn.category_name || txn.account_name || 'Không xác định'}
              </TableCell>
              <TableCell className={`text-right font-mono font-bold ${amountClass}`}>
                {prefix}
                {amountValue}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
