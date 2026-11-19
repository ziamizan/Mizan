import {
  FoodAssistanceStatus,
  FoodCategory,
  FoodDonation,
  FoodDonationStatus,
  FoodDonorType,
  FoodVolunteerRole,
} from '../types';
import { calculateDistanceKm } from './bloodMatching';
import foodHeroImg from '../assets/images/food_rescue_hero_1795029114524.jpg';
import foodCookedImg from '../assets/images/food_cat_cooked_1795029131813.jpg';
import foodProduceImg from '../assets/images/food_cat_produce_1795029114095.jpg';
import foodBakeryImg from '../assets/images/food_cat_bakery_1795029115176.jpg';
import foodGroceriesImg from '../assets/images/food_cat_groceries_1795029140906.jpg';

export const FOOD_HERO_IMAGE = foodHeroImg;

export const FOOD_DONOR_TYPES: FoodDonorType[] = [
  'Individual',
  'Restaurant',
  'Hotel',
  'Bakery',
  'Supermarket',
  'Marriage Hall',
  'Event Organizer',
  'Food Shop',
];

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Cooked Food',
  'Rice and Meals',
  'Vegetables',
  'Fruits',
  'Bread and Bakery',
  'Packed Food',
  'Groceries',
  'Other Food Items',
];

export const FOOD_VOLUNTEER_ROLES: FoodVolunteerRole[] = [
  'Food Pickup',
  'Food Transportation',
  'Food Distribution',
  'Helping Elderly People',
  'Delivering Nearby',
];

export const FOOD_CATEGORY_IMAGES: Record<FoodCategory, string> = {
  'Cooked Food': foodCookedImg,
  'Rice and Meals': foodCookedImg,
  Vegetables: foodProduceImg,
  Fruits: foodProduceImg,
  'Bread and Bakery': foodBakeryImg,
  'Packed Food': foodGroceriesImg,
  Groceries: foodGroceriesImg,
  'Other Food Items': foodHeroImg,
};

export function getFoodCategoryImage(category: FoodCategory, customImageUrl?: string): string {
  if (customImageUrl && customImageUrl.trim().length > 0) {
    return customImageUrl;
  }
  return FOOD_CATEGORY_IMAGES[category] || foodHeroImg;
}

export function generateFoodDonationId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `FDO-${year}-${rand}`;
}

export function generateFoodCollectionRequestId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `FDR-${year}-${rand}`;
}

export function generateFoodAssistanceId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `FAR-${year}-${rand}`;
}

export function generateFoodCertificateId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `FDP-${year}-${rand}`;
}

export function isFoodDeadlineExpired(deadlineIso: string): boolean {
  if (!deadlineIso) return false;
  const ms = new Date(deadlineIso).getTime();
  if (Number.isNaN(ms)) return false;
  return ms <= Date.now();
}

export const isDeadlineExpired = isFoodDeadlineExpired;

export function getRemainingTimeLabel(deadlineIso: string): {
  label: string;
  isUrgent: boolean;
  isExpired: boolean;
} {
  const ms = new Date(deadlineIso).getTime();
  if (Number.isNaN(ms)) {
    return { label: 'Check pickup window', isUrgent: false, isExpired: false };
  }
  const diff = ms - Date.now();
  if (diff <= 0) {
    return { label: 'Expired', isUrgent: false, isExpired: true };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return { label: `${days}d ${hours % 24}h left`, isUrgent: false, isExpired: false };
  }
  if (hours >= 1) {
    return { label: `${hours}h ${mins}m left`, isUrgent: hours <= 3, isExpired: false };
  }
  return { label: `${Math.max(1, mins)}m left`, isUrgent: true, isExpired: false };
}

export function getEffectiveFoodStatus(donation: FoodDonation): FoodDonationStatus {
  if (
    !['Completed', 'Collected', 'Cancelled', 'Expired'].includes(donation.status) &&
    isFoodDeadlineExpired(donation.collectionDeadline)
  ) {
    return 'Expired';
  }
  if (
    donation.availableQuantity <= 0 &&
    !['Completed', 'Collected', 'Ready for Pickup', 'Cancelled', 'Expired'].includes(donation.status)
  ) {
    return 'Reserved';
  }
  return donation.status;
}

export const FOOD_DONATION_STATUS_META: Record<
  FoodDonationStatus,
  { label: string; badgeClass: string }
> = {
  Available: {
    label: 'Available',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  'Request Received': {
    label: 'Request Received',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  Accepted: {
    label: 'Accepted',
    badgeClass:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
  },
  Reserved: {
    label: 'Fully Reserved',
    badgeClass:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
  },
  'Ready for Pickup': {
    label: 'Ready for Pickup',
    badgeClass:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
  Collected: {
    label: 'Collected',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700',
  },
  Completed: {
    label: 'Completed',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700',
  },
  Expired: {
    label: 'Expired',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  Cancelled: {
    label: 'Cancelled',
    badgeClass:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  },
};

export const FOOD_ASSISTANCE_STEPS: FoodAssistanceStatus[] = [
  'Submitted',
  'Searching for Donors',
  'Contributions Received',
  'Partially Fulfilled',
  'Fully Fulfilled',
  'Completed',
];

export const FOOD_ASSISTANCE_STATUS_META: Record<
  FoodAssistanceStatus,
  { label: string; badgeClass: string; stepIndex: number }
> = {
  Submitted: {
    label: 'Submitted',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    stepIndex: 0,
  },
  'Searching for Donors': {
    label: 'Searching for Donors',
    badgeClass:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    stepIndex: 1,
  },
  'Contributions Received': {
    label: 'Contributions Received',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    stepIndex: 2,
  },
  'Partially Fulfilled': {
    label: 'Partially Fulfilled',
    badgeClass:
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    stepIndex: 3,
  },
  'Fully Fulfilled': {
    label: 'Fully Fulfilled',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    stepIndex: 4,
  },
  Completed: {
    label: 'Completed',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200 dark:border-emerald-700',
    stepIndex: 5,
  },
};

export function computeFoodDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateDistanceKm(lat1, lon1, lat2, lon2);
}

export async function compressFoodImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file selected.'));
      img.onload = () => {
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > 350000) {
          resolve(canvas.toDataURL('image/jpeg', 0.52));
        } else {
          resolve(dataUrl);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
