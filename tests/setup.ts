import 'fake-indexeddb/auto';

// Mock AudioContext for jsdom
class AudioContextMock {
    createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, disconnect: () => {} }; }
    createGain() { return { connect: () => {}, gain: { value: 1 } }; }
    createAnalyser() { return { connect: () => {}, frequencyBinCount: 1024, getByteFrequencyData: () => {} }; }
    createMediaStreamSource() { return { connect: () => {} }; }
    close() { return Promise.resolve(); }
}

Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: AudioContextMock
});
Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    value: AudioContextMock
});
