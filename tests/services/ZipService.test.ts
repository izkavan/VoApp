import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZipService } from '../../src/services/ZipService.js';
import JSZip from 'jszip';

describe('ZipService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.URL.createObjectURL = vi.fn(() => 'mock-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    it('creates a zip instance', async () => {
        const zip = await ZipService.createZip();
        expect(zip).toBeInstanceOf(JSZip);
    });

    it('reads json file correctly', async () => {
        const zip = new JSZip();
        zip.file('test.json', JSON.stringify({ key: 'value' }));
        
        const data = await ZipService.readJsonFile(zip, 'test.json', { default: true });
        expect(data).toEqual({ key: 'value' });
    });

    it('returns default value on missing file', async () => {
        const zip = new JSZip();
        const data = await ZipService.readJsonFile(zip, 'missing.json', { default: true });
        expect(data).toEqual({ default: true });
    });

    it('returns default value on invalid JSON', async () => {
        const zip = new JSZip();
        zip.file('bad.json', 'invalid-json');
        
        const data = await ZipService.readJsonFile(zip, 'bad.json', { default: true });
        expect(data).toEqual({ default: true });
    });

    it('downloads zip', async () => {
        const zip = new JSZip();
        zip.file('test.txt', 'hello');
        
        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        await ZipService.downloadZip(zip, 'test.zip');
        
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
});
