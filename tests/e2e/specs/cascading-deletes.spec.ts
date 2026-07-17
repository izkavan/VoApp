import { test, expect } from '@playwright/test';
import { ProjectModalPage } from '../pages/ProjectModalPage';
import { BasePage } from '../pages/BasePage';

/**
 * @purpose Validates that deleting parent entities properly removes all associated child records to prevent database orphans.
 */
test.describe('Cascading Deletes @system-integrity', () => {
    let projectPage: ProjectModalPage;
    let basePage: BasePage;

    test.beforeEach(async ({ page }) => {
        projectPage = new ProjectModalPage(page);
        basePage = new BasePage(page);
        await basePage.navigate();
    });

    test('deleting a project cascades to dictionary entries and voice memos', async ({ page }) => {
        // 1. Create a project
        const projName = 'Orphan Project';
        await projectPage.openNewProjectModal();
        await projectPage.fillProjectDetails(projName, 'To be deleted');
        await projectPage.saveProject();

        await page.waitForTimeout(500);

        // Fetch project ID
        const appState = await basePage.evaluateIndexedDBRecords('app_state');
        const projectsRecord: any = appState.find((r: any) => r.key === 'projects');
        const projectId = projectsRecord.data.find((p: any) => p.name === projName)?.id;
        
        expect(projectId).toBeDefined();

        // 2. Inject dummy data into dictionary and voice_memos attached to this projectId
        await page.evaluate(async (pId) => {
            return new Promise((resolve, reject) => {
                const req = window.indexedDB.open('VoAppDatabase', 7);
                req.onsuccess = (e: any) => {
                    const db = e.target.result;
                    
                    const tx = db.transaction(['dictionary', 'voice_memos'], 'readwrite');
                    
                    tx.objectStore('dictionary').put({
                        id: Date.now().toString(),
                        projectId: pId,
                        term: 'Orphan Term',
                        pronunciation: 'or-fan',
                        description: 'test'
                    });

                    tx.objectStore('voice_memos').put({
                        id: (Date.now() + 1).toString(),
                        projectId: pId,
                        name: 'Orphan Memo'
                    });

                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => reject('Transaction failed');
                };
                req.onerror = () => reject('Open failed');
            });
        }, projectId);

        // 3. Delete the project via UI
        await projectPage.page.locator('.project-section .project-header span').filter({ hasText: projName }).dblclick();
        await page.waitForTimeout(500);
        
        page.once('dialog', dialog => dialog.accept());
        await projectPage.deleteProject();

        await page.waitForTimeout(1000);

        // 4. Verify the dictionary and voice memos stores are empty or don't contain the orphans
        const dictRecords = await basePage.evaluateIndexedDBRecords('dictionary');
        const orphanedDict = dictRecords.find((r: any) => r.data?.projectId === projectId || r.projectId === projectId);
        expect(orphanedDict).toBeUndefined();

        const memoRecords = await basePage.evaluateIndexedDBRecords('voice_memos');
        const orphanedMemo = memoRecords.find((r: any) => r.data?.projectId === projectId || r.projectId === projectId);
        expect(orphanedMemo).toBeUndefined();
    });

    test('deleting a character cascades to journal entries and unlinks from warmups', async ({ page }) => {
        // 1. Create a character
        const charName = 'Orphan Character';
        await page.click('#new-character-button');
        await page.fill('#wc-edit-name', charName);
        await page.click('#wc-save-btn');

        await page.waitForTimeout(500);

        // Fetch character ID
        const appState = await basePage.evaluateIndexedDBRecords('app_state');
        const charsRecord: any = appState.find((r: any) => r.key === 'characters');
        const charId = charsRecord.data.find((c: any) => c.name === charName)?.id;
        
        expect(charId).toBeDefined();

        // 2. Inject dummy data into journal_entries and link it in warmups
        await page.evaluate(async (cId) => {
            return new Promise((resolve, reject) => {
                const req = window.indexedDB.open('VoAppDatabase', 7);
                req.onsuccess = (e: any) => {
                    const db = e.target.result;
                    
                    const tx = db.transaction(['journal_entries', 'app_state'], 'readwrite');
                    
                    tx.objectStore('journal_entries').put({
                        id: Date.now().toString(),
                        characterId: cId,
                        date: '2023-01-01',
                        entry: 'test journal'
                    });

                    // Add to warmup
                    const appStateStore = tx.objectStore('app_state');
                    const getWarmups = appStateStore.get('warmups');
                    getWarmups.onsuccess = () => {
                        const warmupsRecord = getWarmups.result;
                        if (warmupsRecord && warmupsRecord.data && warmupsRecord.data.length > 0) {
                            warmupsRecord.data[0].characterIds = [cId]; // link the character
                            appStateStore.put(warmupsRecord);
                        } else {
                            appStateStore.put({
                                key: 'warmups',
                                data: [{
                                    id: 1,
                                    title: "Test Warmup",
                                    description: "A test warmup",
                                    characterIds: [cId]
                                }]
                            });
                        }
                    };

                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => reject('Transaction failed');
                };
                req.onerror = () => reject('Open failed');
            });
        }, charId);

        // Reload page to ensure DataStore picks up the newly injected IDB records
        await page.reload();
        await page.waitForTimeout(1000);

        // 3. Delete the character via UI
        await page.locator('character-card').filter({ hasText: charName }).click();
        await page.waitForTimeout(500);
        
        page.once('dialog', dialog => dialog.accept());
        await page.locator('character-modal').locator('#wc-del-btn').click();

        await page.waitForTimeout(1000);

        // 4. Verify journal_entries are empty and warmups unlinked
        const journalRecords = await basePage.evaluateIndexedDBRecords('journal_entries');
        const orphanedJournal = journalRecords.find((r: any) => r.data?.characterId === charId || r.characterId === charId);
        expect(orphanedJournal).toBeUndefined();

        const updatedAppState = await basePage.evaluateIndexedDBRecords('app_state');
        const warmupsRecord: any = updatedAppState.find((r: any) => r.key === 'warmups');
        if (warmupsRecord?.data?.[0]?.characterIds) {
            expect(warmupsRecord.data[0].characterIds).not.toContain(charId);
        }
    });
});
