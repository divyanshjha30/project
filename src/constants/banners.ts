export interface BannerPreset {
  id: string;
  name: string;
  gradient: string;
  preview: string; // same as gradient for CSS preview
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: "ocean_blue",
    name: "Ocean Blue",
    gradient: "from-blue-500 via-cyan-500 to-teal-500",
    preview: "from-blue-500 via-cyan-500 to-teal-500",
  },
  {
    id: "sunset",
    name: "Sunset",
    gradient: "from-orange-500 via-rose-500 to-purple-600",
    preview: "from-orange-500 via-rose-500 to-purple-600",
  },
  {
    id: "northern_lights",
    name: "Northern Lights",
    gradient: "from-green-400 via-emerald-500 to-cyan-600",
    preview: "from-green-400 via-emerald-500 to-cyan-600",
  },
  {
    id: "royal_purple",
    name: "Royal Purple",
    gradient: "from-purple-600 via-violet-600 to-indigo-700",
    preview: "from-purple-600 via-violet-600 to-indigo-700",
  },
  {
    id: "midnight",
    name: "Midnight",
    gradient: "from-gray-800 via-slate-700 to-gray-900",
    preview: "from-gray-800 via-slate-700 to-gray-900",
  },
  {
    id: "gold_rush",
    name: "Gold Rush",
    gradient: "from-yellow-500 via-amber-500 to-orange-600",
    preview: "from-yellow-500 via-amber-500 to-orange-600",
  },
  {
    id: "cherry_blossom",
    name: "Cherry Blossom",
    gradient: "from-pink-400 via-rose-400 to-fuchsia-500",
    preview: "from-pink-400 via-rose-400 to-fuchsia-500",
  },
  {
    id: "neon_city",
    name: "Neon City",
    gradient: "from-violet-600 via-fuchsia-500 to-pink-500",
    preview: "from-violet-600 via-fuchsia-500 to-pink-500",
  },
  {
    id: "forest",
    name: "Forest",
    gradient: "from-green-700 via-emerald-600 to-lime-500",
    preview: "from-green-700 via-emerald-600 to-lime-500",
  },
  {
    id: "fire_ice",
    name: "Fire & Ice",
    gradient: "from-red-500 via-purple-600 to-blue-600",
    preview: "from-red-500 via-purple-600 to-blue-600",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    gradient: "from-indigo-900 via-purple-800 to-pink-700",
    preview: "from-indigo-900 via-purple-800 to-pink-700",
  },
  {
    id: "tropical",
    name: "Tropical",
    gradient: "from-cyan-400 via-sky-500 to-blue-600",
    preview: "from-cyan-400 via-sky-500 to-blue-600",
  },
];
