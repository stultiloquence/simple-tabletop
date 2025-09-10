export const clamp = (min, max, x) => Math.max(min, Math.min(max, x))

export class EventEmitter {
	listeners = {};
	on = (event, listener) => {
		if (!this.listeners[event]) {
			this.listeners[event] = [];
		}
		return this.listeners[event].push(listener) - 1;
	}
	off = (event, index) => {
		const listeners = this.listeners[event];
		if (!listeners) {
			return;
		}
		listeners.splice(index, 1);
	}
	fire = (event, ...args) => {
		for (const listener of this.listeners[event] || []) {
			listener(...args);
		}
	}
}