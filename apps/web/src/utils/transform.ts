import type { CommandAction } from "@/components/header/app/command-box";
import type { MenuItem } from "@/components/sidebar/app-sidebar";

export const transformMenuItems = (items: MenuItem[]): CommandAction[] => {
  return items.flatMap((item) => {
    if (item.subItems && item.subItems.length > 0) {
      return item.subItems.map((sub) => ({
        label: sub.label,
        icon: sub.icon || item.icon,
        description: sub.description || `Category: ${item.label}`,
        category: sub.category || item.category || 'System',
        href: sub.href,
      }));
    }

    return {
      label: item.label,
      icon: item.icon,
      description: item.description,
      category: item.category || 'System',
      href: item.href,
    };
  });
};