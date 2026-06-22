import { describe, it, expect } from 'vitest';
import { generateRandomCharacter } from '../../src/data/generator-data.js';

describe('generator-data', () => {
    it('generates a random character with required properties', () => {
        const char = generateRandomCharacter(123);
        
        expect(char).toBeDefined();
        expect(char.projectId).toBe(123);
        expect(char.id).toBeDefined();
        expect(char.name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
        expect(char.description).toBeDefined();
        expect(char.voice_description).toContain(' and ');
        expect(char.tags).toEqual([]);
        expect(char.pitch).toBeGreaterThanOrEqual(1);
        expect(char.pitch).toBeLessThanOrEqual(100);
    });

    it('generates character without projectId', () => {
        const char = generateRandomCharacter(undefined);
        expect(char.projectId).toBeUndefined();
    });
});
