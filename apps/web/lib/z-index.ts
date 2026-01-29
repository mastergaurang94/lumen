/**
 * Z-index layering system.
 * Use these constants instead of magic numbers for consistent stacking.
 */

export const Z_INDEX = {
  /** Base content layer */
  base: 0,
  /** Atmospheric background effects */
  atmosphere: 0,
  /** Main content area */
  content: 10,
  /** Sticky headers and footers */
  sticky: 20,
  /** Fixed navigation elements (hamburger, end session button) */
  navigation: 30,
  /** Sidebar overlay background */
  sidebarOverlay: 40,
  /** Sidebar panel */
  sidebar: 50,
  /** Modal/dialog backdrop */
  modalBackdrop: 50,
  /** Modal/dialog content */
  modal: 50,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
