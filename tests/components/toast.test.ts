import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initializeToastSystem, showToast } from '../../src/components/toast.js';
import { EventBus } from '../../src/services/EventBus.js';

describe('Toast System', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    it('initializes and listens to notify event', () => {
        initializeToastSystem();
        const container = document.getElementById('toast-container');
        expect(container).not.toBeNull();

        EventBus.emit('notify', { message: 'Test Error', type: 'error' });
        
        const toast = container?.querySelector('.toast');
        expect(toast).not.toBeNull();
        expect(toast?.classList.contains('toast-error')).toBe(true);
        expect(toast?.innerHTML).toContain('Test Error');
    });

    it('shows toast and removes it after timeout', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        showToast('Success Msg', 'success', container);

        const toast = container.querySelector('.toast');
        expect(toast).not.toBeNull();
        expect(toast?.classList.contains('toast-success')).toBe(true);

        // Advance 4000ms
        vi.advanceTimersByTime(4000);
        expect(toast?.classList.contains('show')).toBe(false);

        // Advance 300ms for removal
        vi.advanceTimersByTime(300);
        expect(container.querySelector('.toast')).toBeNull();
    });
});
