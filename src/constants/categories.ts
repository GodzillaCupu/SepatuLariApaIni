import { ShoeCategory, CategoryMeta } from "@/types";

export const CATEGORIES_META: Record<ShoeCategory, CategoryMeta> = {
  daily_trainer: {
    key: "daily_trainer",
    label: "Daily Trainer",
    badgeColor: "text-emerald-700",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    description: "Sepatu serbaguna untuk latihan harian, recovery run, dan long run santai.",
    iconName: "Activity",
  },
  max_cushion: {
    key: "max_cushion",
    label: "Max Cushion",
    badgeColor: "text-amber-700",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    description: "Bantalan tebal maksimal untuk meredam impak, menjaga sendi saat recovery run.",
    iconName: "Shield",
  },
  tempo_speed: {
    key: "tempo_speed",
    label: "Tempo / Speed",
    badgeColor: "text-orange-700",
    badgeBg: "bg-orange-50",
    badgeBorder: "border-orange-200",
    description: "Ringan dan responsif untuk lari tempo, interval, dan fartlek cepat.",
    iconName: "Zap",
  },
  race_day: {
    key: "race_day",
    label: "Race Day",
    badgeColor: "text-red-700",
    badgeBg: "bg-red-50",
    badgeBorder: "border-red-200",
    description: "Super shoe dengan busa PEBA & pelat karbon untuk personal best dan maraton.",
    iconName: "Trophy",
  },
  trail: {
    key: "trail",
    label: "Trail Running",
    badgeColor: "text-purple-700",
    badgeBg: "bg-purple-50",
    badgeBorder: "border-purple-200",
    description: "Grip ekstra dan proteksi kaki untuk medan tanah, batu, dan alam bebas.",
    iconName: "Mountain",
  },
};
