import { describe, it, expect, beforeEach } from 'vitest';
import { extractFormData, parseTags } from '../../src/utils/form-utils.js';

describe('form-utils', () => {
    describe('parseTags', () => {
        it('parses comma-separated tags', () => {
            const tags = parseTags('tag1, tag2 , tag3');
            expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
        });

        it('ignores empty strings and returns empty array', () => {
            expect(parseTags('')).toEqual([]);
            expect(parseTags('   ,  , ')).toEqual([]);
        });
    });

    describe('extractFormData', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="form-container">
                    <input type="text" name="username" value="JohnDoe" />
                    <input type="number" id="age" value="30" />
                    <input type="checkbox" name="isActive" checked />
                    <input type="checkbox" name="isDeleted" />
                    <select name="role">
                        <option value="admin" selected>Admin</option>
                    </select>
                    <textarea name="bio">Hello world</textarea>
                    <input type="text" value="NoName" /> <!-- Should be ignored -->
                </div>
            `;
        });

        it('extracts data correctly from container', () => {
            const data = extractFormData('form-container');
            
            expect(data).toEqual({
                username: 'JohnDoe',
                age: 30,
                isActive: true,
                isDeleted: false,
                role: 'admin',
                bio: 'Hello world'
            });
        });

        it('returns empty object if container not found', () => {
            const data = extractFormData('non-existent');
            expect(data).toEqual({});
        });
    });
});
