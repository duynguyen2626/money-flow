import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Installment } from "@/services/installment.service"
import { formatCurrency } from "@/lib/utils"

interface InstallmentStatsProps {
    installments: Installment[]
}

export function InstallmentStats({ installments }: InstallmentStatsProps) {
    const activeCount = installments.filter(i => i.status === 'active').length
    const monthlyDue = installments
        .filter(i => i.status === 'active')
        .reduce((sum, i) => sum + i.monthly_amount, 0)
    const totalRemaining = installments
        .filter(i => i.status === 'active')
        .reduce((sum, i) => sum + i.remaining_amount, 0)

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{activeCount}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Due</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(monthlyDue)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalRemaining)}</div>
                </CardContent>
            </Card>
        </div>
    )
}
