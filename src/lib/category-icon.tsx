
import {
    ShoppingBag,
    Utensils,
    Car,
    Home,
    Zap,
    HeartPulse,
    Gamepad2,
    GraduationCap,
    Plane,
    Briefcase,
    MoreHorizontal,
    LucideIcon
} from 'lucide-react';

export const getCategoryIcon = (categoryName: string | undefined): LucideIcon => {
    if (!categoryName) return MoreHorizontal;
    const lower = categoryName.toLowerCase();

    if (lower.includes('food') || lower.includes('eat') || lower.includes('dining')) return Utensils;
    if (lower.includes('shopping') || lower.includes('buy') || lower.includes('mall')) return ShoppingBag;
    if (lower.includes('transport') || lower.includes('taxi') || lower.includes('bus') || lower.includes('train') || lower.includes('fuel') || lower.includes('gas')) return Car;
    if (lower.includes('home') || lower.includes('rent') || lower.includes('house')) return Home;
    if (lower.includes('util') || lower.includes('bill') || lower.includes('electric') || lower.includes('water')) return Zap;
    if (lower.includes('health') || lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('med')) return HeartPulse;
    if (lower.includes('entert') || lower.includes('game') || lower.includes('movie') || lower.includes('fun')) return Gamepad2;
    if (lower.includes('educ') || lower.includes('school') || lower.includes('course') || lower.includes('learn')) return GraduationCap;
    if (lower.includes('travel') || lower.includes('trip') || lower.includes('hotel') || lower.includes('flight')) return Plane;
    if (lower.includes('work') || lower.includes('job') || lower.includes('salary') || lower.includes('income')) return Briefcase;

    return MoreHorizontal;
};
