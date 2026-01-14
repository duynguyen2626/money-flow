export function computeCardCashbackProfit(input: {
    cashbackRedeemed: number
    cashbackGiven: number
    annualFee?: number
    interest?: number
}) {
    const fee = input.annualFee ?? 0
    const interest = input.interest ?? 0
    return input.cashbackRedeemed + interest - fee - input.cashbackGiven
}
