"use client";

import { createElement, memo } from "react";
import { cn } from "@/shared/utils/cn";
import * as LucideIcons from "lucide-react";

// Map Material Symbol names → Lucide icon names
const nameToLucide = {
  // Navigation & UI
  arrow_forward: "ArrowRight",
  arrow_back: "ArrowLeft",
  arrow_upward: "ArrowUp",
  arrow_downward: "ArrowDown",
  chevron_right: "ChevronRight",
  chevron_left: "ChevronLeft",
  expand_more: "ChevronDown",
  expand_less: "ChevronUp",
  keyboard_arrow_up: "ChevronUp",
  keyboard_arrow_down: "ChevronDown",
  close: "X",
  menu: "Menu",
  search: "Search",
  add: "Plus",
  delete: "Trash2",
  edit: "Pencil",
  save: "Save",
  check: "Check",
  check_circle: "CircleCheck",
  error: "XCircle",
  warning: "TriangleAlert",
  info: "Info",
  help: "CircleHelp",
  filter_list: "ListFilter",
  more_vert: "MoreVertical",
  drag_indicator: "GripVertical",
  sort: "ArrowLeftRight",
  tune: "SlidersHorizontal",
  send: "Send",
  fullscreen: "Maximize",
  fullscreen_exit: "Minimize",
  notifications: "Bell",
  fiber_manual_record: "Circle",
  schedule: "Calendar",
  history: "RotateCcw",
  done_all: "ListChecks",

  // Actions
  content_copy: "Copy",
  copy: "Copy",
  open_in_new: "SquareArrowOutUpRight",
  refresh: "RefreshCw",
  restore: "RotateCcw",
  play_arrow: "Play",
  play_circle: "CirclePlay",
  stop_circle: "CircleStop",
  power_settings_new: "Power",
  power_off: "PowerOff",
  progress_activity: "Loader2",
  cancel: "Ban",
  block: "Ban",
  stop: "Square",
  restart_alt: "RotateCw",

  // Features
  bolt: "Zap",
  hub: "Network",
  rocket_launch: "Rocket",
  science: "FlaskConical",
  auto_awesome: "Sparkles",
  psychology: "Brain",
  neurology: "Brain",
  lightbulb: "Lightbulb",
  shield: "Shield",
  shield_lock: "ShieldCheck",
  verified_user: "BadgeCheck",
  lock: "Lock",
  lock_open: "LockKeyholeOpen",
  key: "Key",
  vpn_key: "KeyRound",
  security: "Shield",
  health_and_safety: "ShieldCheck",
  payments: "CreditCard",

  // Tech
  terminal: "Terminal",
  code: "Code2",
  api: "Code2",
  database: "Database",
  cloud: "Cloud",
  cloud_upload: "CloudUpload",
  cloud_sync: "CloudUpload",
  lan: "Network",
  wifi: "Wifi",
  computer: "Monitor",
  data_object: "Braces",
  model_training: "Cpu",
  extension: "Puzzle",
  build: "Wrench",
  bug_report: "TriangleAlert",

  // Dashboard
  dashboard: "LayoutDashboard",
  bar_chart: "BarChart3",
  monitoring: "Activity",
  dns: "Server",
  data_usage: "Activity",
  network_ping: "Activity",
  speed: "Activity",
  analytics: "TrendingUp",

  // Misc
  layers: "Layers",
  savings: "PiggyBank",
  star: "Star",
  person: "User",
  account_circle: "CircleUser",
  group: "Users",
  chat: "MessageSquare",
  language: "Languages",
  checklist: "ListChecks",
  attach_file: "Paperclip",
  file_upload: "Upload",
  download: "Download",
  volunteer_activism: "HeartHandshake",
  grid_view: "LayoutGrid",
  gavel: "Gavel",
  link_off: "Link2Off",
  sync_alt: "ArrowLeftRight",
  swap_horiz: "ArrowLeftRight",
  trending_down: "TrendingDown",
  route: "Route",
  summarize: "FileText",
  font_download: "Type",
  business: "Building2",
  difference: "Diff",
  compress: "Shrink",
  visibility: "Eye",
  visibility_off: "EyeOff",
  logout: "LogOut",
  login: "LogOut",
  palette: "Sparkles",
  description: "FileText",
  smart_toy: "Cpu",

  // Dark/Light mode
  dark_mode: "Moon",
  light_mode: "Sun",

  // Misc remaining
  phonelink: "Monitor",
  smartphone: "Monitor",
  link: "Link",
  globe: "Globe",
  home: "LayoutDashboard",
  bookmark: "Star",
  favorite: "HeartHandshake",
  thumb_up: "TrendingUp",
  thumb_down: "TrendingDown",
  shopping_cart: "Package",
  inventory: "Package",
  email: "Mail",
  call: "Phone",
  location_on: "Globe",
  calendar_today: "Calendar",
  access_time: "Calendar",
  backup: "Database",
  upload: "Upload",
};

/**
 * Icon component — renders Lucide icons by Material Symbol name.
 * @param {string} name - Material Symbol name (auto-mapped to Lucide)
 * @param {number|string} size - Icon size in px (default 18)
 * @param {string} className - Additional CSS classes
 * @param {object} style - Inline styles
 */
const Icon = memo(function Icon({ name, size = 18, className, style, ...props }) {
  const s = typeof size === "number" ? size : parseInt(size, 10) || 18;
  const lucideName = nameToLucide[name] || "Circle";
  const IconComponent = LucideIcons[lucideName] || LucideIcons.Circle;

  return createElement(IconComponent, {
    size: s,
    className: cn(className),
    style,
    strokeWidth: 2,
    ...props,
  });
});

export default Icon;
export { nameToLucide };
