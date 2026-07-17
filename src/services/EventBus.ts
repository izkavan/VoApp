export type EventHandler<T = any> = (event: CustomEvent<T>) => void;

class AppEventBus extends EventTarget {
  /**
   * Dispatch an event to all registered listeners.
   * @param eventName The name of the event to emit
   * @param detail Optional data to pass along with the event
   */
  emit<T = any>(eventName: string, detail?: T) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  /**
   * Register an event listener.
   * @param eventName The name of the event to listen for
   * @param handler The callback function to execute when the event is emitted
   */
  on<T = any>(eventName: string, handler: EventHandler<T>) {
    this.addEventListener(eventName, handler as EventListener);
  }

  /**
   * Remove an event listener.
   * @param eventName The name of the event to stop listening for
   * @param handler The callback function to remove
   */
  off<T = any>(eventName: string, handler: EventHandler<T>) {
    this.removeEventListener(eventName, handler as EventListener);
  }
}

// Export a singleton instance to be used across the application
export const EventBus = new AppEventBus();
