import { ref, Ref, onUnmounted } from 'vue';

interface DragOptions {
  onDragStart?: (index: number, event: PointerEvent) => void;
  onDragMove?: (deltaX: number, deltaY: number, event: PointerEvent) => void;
  onDragEnd?: (fromIndex: number, toIndex: number) => void;
  onTap?: (index: number, event: PointerEvent) => void;
  threshold?: number;
}

interface DragReturn {
  isDragging: Ref<boolean>;
  dragSourceIndex: Ref<number | null>;
  onPointerDown: (index: number, event: PointerEvent) => void;
  onPointerMove: (index: number, event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
}

export function useDrag(options: DragOptions): DragReturn {
  const {
    onDragStart,
    onDragMove,
    onDragEnd,
    onTap,
    threshold = 8
  } = options;

  const isDragging = ref(false);
  const dragSourceIndex = ref<number | null>(null);
  const startX = ref(0);
  const startY = ref(0);
  const dragGhostEl = ref<HTMLElement | null>(null);

  function clearDragVisuals() {
    if (dragGhostEl.value) {
      dragGhostEl.value.remove();
      dragGhostEl.value = null;
    }
    document.querySelectorAll('.grid-cell.dragging').forEach(c => c.classList.remove('dragging'));
    document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
  }

  const onPointerDown = (index: number, event: PointerEvent) => {
    startX.value = event.clientX;
    startY.value = event.clientY;

    dragSourceIndex.value = index;

    if (onDragStart) {
      onDragStart(index, event);
    }

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const deltaX = event.clientX - startX.value;
    const deltaY = event.clientY - startY.value;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (!isDragging.value && distance > threshold) {
      isDragging.value = true;

      const srcCell = document.querySelector(`.grid-cell[data-index="${dragSourceIndex.value}"]`);
      if (srcCell) srcCell.classList.add('dragging');

      if (dragSourceIndex.value !== null) {
        const emojiEl = srcCell?.querySelector('.item-emoji');
        dragGhostEl.value = document.createElement('div');
        dragGhostEl.value.className = 'drag-ghost';
        dragGhostEl.value.textContent = emojiEl?.textContent || '';
        dragGhostEl.value.style.left = `${event.clientX}px`;
        dragGhostEl.value.style.top = `${event.clientY}px`;
        document.body.appendChild(dragGhostEl.value);
      }
    }

    if (isDragging.value) {
      if (dragGhostEl.value) {
        dragGhostEl.value.style.left = `${event.clientX}px`;
        dragGhostEl.value.style.top = `${event.clientY}px`;
      }

      document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (target) {
        const gc = target.closest('.grid-cell') as HTMLElement | null;
        if (gc && parseInt(gc.dataset.index || '-1') !== dragSourceIndex.value) {
          gc.classList.add('drop-target');
        }
      }

      if (onDragMove) {
        onDragMove(deltaX, deltaY, event);
      }
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);

    if (isDragging.value) {
      clearDragVisuals();

      if (onDragEnd && dragSourceIndex.value !== null) {
        const targetElement = document.elementFromPoint(event.clientX, event.clientY);
        const targetCell = targetElement?.closest('.grid-cell');
        const targetIndex = targetCell ? parseInt(targetCell.getAttribute('data-index') || '-1') : -1;

        if (targetIndex !== -1 && targetIndex !== dragSourceIndex.value) {
          onDragEnd(dragSourceIndex.value, targetIndex);
        }
      }
    } else if (onTap && dragSourceIndex.value !== null) {
      onTap(dragSourceIndex.value, event);
    }

    isDragging.value = false;
    dragSourceIndex.value = null;
  };

  const onPointerMove = (_index: number, _event: PointerEvent) => {};

  const onPointerUp = (_event: PointerEvent) => {};

  onUnmounted(() => {
    if (isDragging.value) {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      clearDragVisuals();
      isDragging.value = false;
      dragSourceIndex.value = null;
    }
  });

  return {
    isDragging,
    dragSourceIndex,
    onPointerDown,
    onPointerMove,
    onPointerUp
  };
}
