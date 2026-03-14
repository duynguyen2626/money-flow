"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Book, Store, Tag } from "lucide-react";
import Image from "next/image";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { SingleTransactionFormValues } from "../types";
import { Category, Shop } from "@/types/moneyflow.types";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";

import {
  getRecentShopByCategoryId,
  getRecentShopIdsByCategoryId,
  getRecentCategoriesByShopId,
} from "@/actions/cascade-actions";

type CategoryShopSectionProps = {
  shops: Shop[];
  categories: Category[];
  onAddNewCategory?: () => void;
  onAddNewShop?: () => void;
  isLoadingCategories?: boolean;
  isLoadingShops?: boolean;
  isEditing?: boolean;
};

export function CategoryShopSection({
  shops,
  categories,
  onAddNewCategory,
  onAddNewShop,
  isLoadingCategories,
  isLoadingShops,
  isEditing,
}: CategoryShopSectionProps) {
  const form = useFormContext<SingleTransactionFormValues>();
  const transactionType = useWatch({ control: form.control, name: "type" });
  const categoryId = useWatch({ control: form.control, name: "category_id" });
  const shopId = useWatch({ control: form.control, name: "shop_id" });
  const isEditingMode = Boolean(isEditing);

  const normalizeValue = useCallback(
    (value: string | null | undefined) => value?.trim().toLowerCase() || null,
    [],
  );

  const resolveCategoryValue = useCallback((value: string | null | undefined) => {
    const normalized = normalizeValue(value);
    if (!normalized) return null;

    const matched = categories.find((category) => {
      return (
        normalizeValue(category.id) === normalized ||
        normalizeValue(category.slug ?? null) === normalized ||
        normalizeValue(category.name) === normalized
      );
    });

    return matched?.id ?? value ?? null;
  }, [categories, normalizeValue]);

  const resolveShopValue = useCallback((value: string | null | undefined) => {
    const normalized = normalizeValue(value);
    if (!normalized) return null;

    const matched = shops.find((shop) => {
      return (
        normalizeValue(shop.id) === normalized ||
        normalizeValue(shop.name) === normalized
      );
    });

    return matched?.id ?? value ?? null;
  }, [normalizeValue, shops]);

  // Track historical relationships to support many-to-many
  const [shopHistoricalCategoryIds, setShopHistoricalCategoryIds] = useState<
    string[]
  >([]);
  const [categoryHistoricalShopIds, setCategoryHistoricalShopIds] = useState<
    string[]
  >([]);

  // Filter categories based on transaction type
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const normalizedCurrentCategoryId = normalizeValue(categoryId);
      const isCurrentSelection =
        normalizedCurrentCategoryId !== null &&
        [normalizeValue(c.id), normalizeValue(c.slug ?? null), normalizeValue(c.name)].includes(
          normalizedCurrentCategoryId,
        );

      if (isCurrentSelection) return true;

      if (!c.type) return true;
      const catType = c.type.toLowerCase();
      const txType = transactionType?.toLowerCase() || "expense";

      if (["expense", "debt", "credit_pay"].includes(txType))
        return catType === "expense";
      if (["income", "repayment"].includes(txType)) return catType === "income";
      if (txType === "transfer") return catType === "transfer";
      if (txType === "invest") return catType === "investment";

      return true;
    });
  }, [categories, categoryId, transactionType]);

  useEffect(() => {
    const normalizedCategoryId = resolveCategoryValue(categoryId);
    if (normalizedCategoryId && normalizedCategoryId !== categoryId) {
      form.setValue("category_id", normalizedCategoryId, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }

    const normalizedShopId = resolveShopValue(shopId);
    if (normalizedShopId && normalizedShopId !== shopId) {
      form.setValue("shop_id", normalizedShopId, {
        shouldDirty: false,
        shouldTouch: false,
      });
    }
  }, [categoryId, form, shopId, categories, shops]);

  const isValidUrl = (url: string | null | undefined): url is string => {
    if (!url) return false;
    try {
      // Next.js Image handles relative paths and absolute URLs
      if (url.startsWith("/") || url.startsWith("http")) return true;
      return false;
    } catch {
      return false;
    }
  };

  // 2. Derive many-to-many relationship for shops (CASCADE)
  // If a category is selected, prioritize shops that belong to it or have been used with it.
  const effectiveCategoryHistoricalShopIds = categoryId
    ? categoryHistoricalShopIds
    : [];
  const effectiveShopHistoricalCategoryIds = shopId
    ? shopHistoricalCategoryIds
    : [];

  const sortedShopOptions = useMemo(() => {
    if (!categoryId) {
      return shops.map((s) => ({
        value: s.id,
        label: s.name,
        icon: isValidUrl(s.image_url) ? (
          <Image
            src={s.image_url}
            alt={s.name}
            width={24}
            height={24}
            className="object-contain rounded-none"
          />
        ) : (
          <Store className="w-4 h-4 text-slate-400" />
        ),
      }));
    }

    const historicalSet = new Set(effectiveCategoryHistoricalShopIds);

    // Filter and sort:
    // 1. Matches via default_category_id or History
    // 2. Others below
    return [...shops]
      .sort((a, b) => {
        const aMatch =
          a.default_category_id === categoryId || historicalSet.has(a.id);
        const bMatch =
          b.default_category_id === categoryId || historicalSet.has(b.id);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      })
      .map((s) => ({
        value: s.id,
        label: s.name,
        icon: isValidUrl(s.image_url) ? (
          <Image
            src={s.image_url}
            alt={s.name}
            width={24}
            height={24}
            className="object-contain rounded-none"
          />
        ) : (
          <Store className="w-4 h-4 text-slate-400" />
        ),
      }));
  }, [shops, categoryId, effectiveCategoryHistoricalShopIds]);

  const categoryOptions = filteredCategories.map((c) => {
    let badgeLabel =
      c.type === "expense"
        ? "Expense"
        : c.type === "income"
          ? "Income"
          : "Transfer";
    let badgeColor = "bg-slate-100 text-slate-500 border-slate-200";

    if (c.type === "expense") {
      if (c.kind === "internal") {
        badgeLabel = "Lend";
        badgeColor = "bg-amber-50 text-amber-600 border-amber-100";
      } else {
        badgeColor = "bg-rose-50 text-rose-600 border-rose-100";
      }
    } else if (c.type === "income") {
      if (c.kind === "internal") {
        badgeLabel = "Repay";
        badgeColor = "bg-blue-50 text-blue-600 border-blue-100";
      } else {
        badgeColor = "bg-emerald-50 text-emerald-600 border-emerald-100";
      }
    } else if (c.type === "transfer") {
      badgeColor = "bg-indigo-50 text-indigo-600 border-indigo-100";
    }

    return {
      value: c.id,
      label: c.name,
      icon: isValidUrl(c.image_url) ? (
        <Image
          src={c.image_url}
          alt={c.name}
          width={20}
          height={20}
          className="object-contain rounded-none"
        />
      ) : c.icon ? (
        <span className="text-sm">{c.icon}</span>
      ) : (
        <Book className="w-4 h-4 text-slate-400" />
      ),
      badge: (
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] uppercase tracking-tighter py-0 px-1.5 font-bold border rounded-md",
            badgeColor,
          )}
        >
          {badgeLabel}
        </Badge>
      ),
    };
  });

  // Prioritize categories that this shop has been used with (many-to-many relationship support)
  const sortedCategoryOptions = useMemo(() => {
    if (!shopId || effectiveShopHistoricalCategoryIds.length === 0)
      return categoryOptions;

    const historicalSet = new Set(effectiveShopHistoricalCategoryIds);
    return [...categoryOptions].sort((a, b) => {
      const aIsHist = historicalSet.has(a.value);
      const bIsHist = historicalSet.has(b.value);
      if (aIsHist && !bIsHist) return -1;
      if (!aIsHist && bIsHist) return 1;
      return 0;
    });
  }, [categoryOptions, shopId, effectiveShopHistoricalCategoryIds]);

  // CASCADE: Select Category -> Suggest Shop
  useEffect(() => {
    if (!categoryId) return;

    const currentShopId = form.getValues("shop_id");

    const fetchShops = async () => {
      // Fetch multiple historical shops to improve the dropdown sorting
      const recentShopIds = await getRecentShopIdsByCategoryId(categoryId);
      setCategoryHistoricalShopIds(recentShopIds);

      if (!currentShopId) {
        if (recentShopIds.length > 0) {
          form.setValue("shop_id", recentShopIds[0], { shouldDirty: true });
        } else {
          // Fallback to the single most recent shop logic
          const recentShopId = await getRecentShopByCategoryId(categoryId);
          if (recentShopId) {
            form.setValue("shop_id", recentShopId, { shouldDirty: true });
          }
        }
      }
    };

    fetchShops();
  }, [categoryId, form, shops]);

  // CASCADE: Select Shop -> Auto-set Category
  useEffect(() => {
    if (!shopId) return;

    const currentCategoryId = form.getValues("category_id");
    if (currentCategoryId) {
      return;
    }
    const selectedShop = shops.find((s) => s.id === shopId);

    const applyCategory = async () => {
      // Fetch historical categories for this shop to check compatibility
      const recentCategoryIds = await getRecentCategoriesByShopId(shopId);
      setShopHistoricalCategoryIds(recentCategoryIds);

      // Determine if current category is compatible with the new shop
      if (!currentCategoryId) {
        // 1. Try default category from shop definition
        if (selectedShop?.default_category_id) {
          form.setValue(
            "category_id",
            resolveCategoryValue(selectedShop.default_category_id),
            {
            shouldDirty: true,
            },
          );
        }
        // 2. Or use the most recent one from history
        else if (recentCategoryIds.length > 0) {
          form.setValue("category_id", resolveCategoryValue(recentCategoryIds[0]), {
            shouldDirty: true,
          });
        }
      }
    };

    applyCategory();
  }, [shopId, form, shops, resolveCategoryValue]);

  // Auto-select defaults logic
  useEffect(() => {
    if (isEditingMode) return;
    const currentCategoryId = resolveCategoryValue(form.getValues("category_id"));
    const isCurrentCategoryCompatible =
      !!currentCategoryId &&
      filteredCategories.some((c) => c.id === currentCategoryId);

    if (isEditingMode && currentCategoryId) return;
    if (isCurrentCategoryCompatible) return;

    if (currentCategoryId && !isCurrentCategoryCompatible) {
      const fallback = filteredCategories[0];
      if (fallback) {
        form.setValue("category_id", fallback.id, { shouldDirty: true });
      }
      return;
    }

    if (transactionType === "debt") {
      const shoppingCat = categories.find(
        (c) => c.name === "Shopping" || c.name === "Mua sắm",
      );
      if (shoppingCat) {
        form.setValue("category_id", shoppingCat.id);
        return;
      }
    } else if (transactionType === "repayment") {
      const repaymentCat = categories.find(
        (c) => c.name === "Repayment" || c.name === "Thu nợ",
      );
      if (repaymentCat) {
        form.setValue("category_id", repaymentCat.id);
        return;
      }
    }

    const fallback = filteredCategories[0];
    if (fallback) form.setValue("category_id", fallback.id);
  }, [transactionType, categories, filteredCategories, form, isEditingMode, resolveCategoryValue]);

  // Shop is only truly irrelevant for Internal Transfers, Credit Card Payments, Income and Repayment
  const isShopHidden = [
    "transfer",
    "credit_pay",
    "income",
    "repayment",
  ].includes(transactionType);

  // Auto-clear shop if hidden
  useEffect(() => {
    if (isShopHidden) {
      const currentShop = form.getValues("shop_id");
      if (currentShop) form.setValue("shop_id", null);
    }
  }, [isShopHidden, form]);

  return (
    <div className="space-y-4">

      <div
        className={cn(
          "grid gap-4",
          isShopHidden ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {/* Category Selection */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                Category
              </FormLabel>
              <FormControl>
                <Combobox
                  items={sortedCategoryOptions}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  placeholder="Select Category"
                  hideTriggerBadge
                  className="w-full h-11 bg-slate-50/50 border-slate-200 rounded-xl"
                  onAddNew={onAddNewCategory}
                  addLabel="Category"
                  isLoading={isLoadingCategories}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Shop Selection */}
        {!isShopHidden && (
          <FormField
            control={form.control}
            name="shop_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Merchant / Shop
                </FormLabel>
                <FormControl>
                  <Combobox
                    items={sortedShopOptions}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    placeholder="External Source"
                    hideTriggerBadge
                    className="w-full h-11 bg-slate-50/50 border-slate-200 rounded-xl"
                    onAddNew={onAddNewShop}
                    addLabel="Shop"
                    isLoading={isLoadingShops}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
