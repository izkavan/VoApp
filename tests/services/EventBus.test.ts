import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from '../../src/services/EventBus.js';

describe('EventBus', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('emits an event and triggers handler', () => {
        const handler = vi.fn();
        EventBus.on('testEvent', handler);
        
        EventBus.emit('testEvent', { data: 123 });
        
        expect(handler).toHaveBeenCalledTimes(1);
        const eventArg = handler.mock.calls[0][0];
        expect(eventArg.detail).toEqual({ data: 123 });
    });

    it('removes an event listener', () => {
        const handler = vi.fn();
        EventBus.on('testEvent2', handler);
        EventBus.off('testEvent2', handler);
        
        EventBus.emit('testEvent2', { data: 123 });
        
        expect(handler).not.toHaveBeenCalled();
    });

    it('handles multiple listeners for the same event', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        
        EventBus.on('testEvent3', handler1);
        EventBus.on('testEvent3', handler2);
        
        EventBus.emit('testEvent3');
        
        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
    });
});
