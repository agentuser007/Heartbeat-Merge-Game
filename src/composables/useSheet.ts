// ============================================================
// useSheet.ts — Composable for bottom sheet state management
// ============================================================
// Ensures only one sheet is open at a time via a shared reactive ref.
// Usage:
//   const { isOpen, open, close } = useSheet('inventory-sheet')
//   open()   // opens this sheet, closes any other
//   close()  // closes this sheet
// ============================================================

import { ref, computed } from 'vue'

const activeSheet = ref<string | null>(null)

export function useSheet(sheetId: string) {
  const isOpen = computed({
    get: () => activeSheet.value === sheetId,
    set: (val: boolean) => {
      activeSheet.value = val ? sheetId : null
    }
  })

  function open() {
    activeSheet.value = sheetId
  }

  function close() {
    if (activeSheet.value === sheetId) {
      activeSheet.value = null
    }
  }

  return { isOpen, open, close }
}
