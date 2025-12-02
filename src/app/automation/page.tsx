import { getBots } from '@/services/bot-config.service'
import { getCategories } from '@/services/category.service'
import { BotList } from './bot-list'

export default async function AutomationPage() {
    const [bots, categories] = await Promise.all([getBots(), getCategories()])

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">Automation Center</h1>
            <BotList initialBots={bots} categories={categories} />
        </div>
    )
}
