'use server';

import { pocketbaseList, toPocketBaseId } from '@/services/pocketbase/server';

export async function getRecentShopByCategoryId(categoryId: string): Promise<string | null> {
    try {
        const pbCatId = toPocketBaseId(categoryId, 'categories')
        const response = await pocketbaseList<any>('transactions', {
            filter: `category_id='${pbCatId}' && shop_id != ''`,
            sort: '-occurred_at',
            perPage: 1
        })
        return response.items[0]?.shop_id || null
    } catch (err) {
        console.error('PB: getRecentShopByCategoryId failed:', err)
        return null
    }
}

export async function getRecentShopIdsByCategoryId(categoryId: string): Promise<string[]> {
    try {
        const pbCatId = toPocketBaseId(categoryId, 'categories')
        const response = await pocketbaseList<any>('transactions', {
            filter: `category_id='${pbCatId}' && shop_id != ''`,
            sort: '-occurred_at',
            perPage: 50
        })
        const ids = response.items.map(t => t.shop_id).filter(Boolean)
        return Array.from(new Set(ids)).slice(0, 10)
    } catch (err) {
        console.error('PB: getRecentShopIdsByCategoryId failed:', err)
        return []
    }
}

export async function getRecentCategoriesByShopId(shopId: string): Promise<string[]> {
    try {
        const pbShopId = toPocketBaseId(shopId, 'shops')
        const response = await pocketbaseList<any>('transactions', {
            filter: `shop_id='${pbShopId}' && category_id != ''`,
            sort: '-occurred_at',
            perPage: 50
        })
        const ids = response.items.map(t => t.category_id).filter(Boolean)
        return Array.from(new Set(ids)).slice(0, 5)
    } catch (err) {
        console.error('PB: getRecentCategoriesByShopId failed:', err)
        return []
    }
}
