/**
 * Badges.js
 * Handles badge generation and retrieval.
 */

const BADGE_CONFIG = {
    FOLDER_NAME: 'badges',
    API_ENDPOINT: 'https://enter.pollinations.ai/api/generate/image/',
    MODEL: 'nanobanana',
    WIDTH: 1024,
    HEIGHT: 1024,
    WORD_LIST_URL: 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt'
};

const Badges = {
    /**
     * Creates a pending badge request.
     */
    createBadgeRequest: function (userEmail, meetingId) {
        const badgeId = 'B-' + Math.floor(Date.now() / 1000) + '-' + generateBase36(3);

        const badgeData = {
            badgeId: badgeId,
            ownerEmail: userEmail,
            originalOwnerEmail: userEmail,
            meetingId: meetingId,
            timestamp: new Date().toISOString(),
            prompt: '',
            driveURL: '',
            status: 'pending'
        };

        createRow(DB_CONFIG.SHEET_NAMES.BADGES, badgeData);

        // Trigger processing asynchronously
        ensureTrigger();

        return badgeId;
    },

    /**
     * Processes pending badges.
     * Called by trigger.
     */
    processPendingBadges: function () {
        const sheet = getSheet(DB_CONFIG.SHEET_NAMES.BADGES);
        const data = readAll(DB_CONFIG.SHEET_NAMES.BADGES);
        const pending = data.filter(b => b.status === 'pending');

        if (pending.length === 0) return;

        const folder = getOrCreateFolder(BADGE_CONFIG.FOLDER_NAME);
        const apiKey = PropertiesService.getScriptProperties().getProperty('POLLINATIONS_API_KEY');

        if (!apiKey) {
            console.error('POLLINATIONS_API_KEY not set in Script Properties.');
            return;
        }

        const wordList = getWordList();

        // Prepare requests for ALL pending badges
        const requests = pending.map(badge => {
            // Generate Prompt
            const randomWords = [];
            for (let i = 0; i < 5; i++) {
                randomWords.push(wordList[Math.floor(Math.random() * wordList.length)]);
            }
            const wordString = randomWords.join(' ');
            // This wrapper creates a sentence structure so the API accepts the list
            const fullPrompt = "A cohesive art piece inspired by: " + wordString;

            // Store prompt on badge object for later use
            badge.generatedPrompt = fullPrompt;

            const encodedPrompt = encodeURIComponent(fullPrompt);
            const url = `${BADGE_CONFIG.API_ENDPOINT}${encodedPrompt}?model=${BADGE_CONFIG.MODEL}&width=${BADGE_CONFIG.WIDTH}&height=${BADGE_CONFIG.HEIGHT}&nologo=true&private=true`;

            return {
                url: url,
                method: 'get',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                muteHttpExceptions: true
            };
        });

        try {
            // Execute all requests in parallel
            const responses = UrlFetchApp.fetchAll(requests);

            responses.forEach((response, index) => {
                const badge = pending[index];
                const responseCode = response.getResponseCode();
                const contentType = response.getHeaders()['Content-Type'] || '';

                try {
                    if (contentType.includes('application/json')) {
                        const jsonBody = JSON.parse(response.getContentText());
                        if (jsonBody.success === false || responseCode !== 200) {
                            throw new Error(`API Error: ${JSON.stringify(jsonBody)}`);
                        }
                    } else if (responseCode !== 200) {
                        throw new Error(`HTTP Error: ${responseCode}`);
                    }

                    const blob = response.getBlob().setName(badge.badgeId + '.jpg');
                    const file = folder.createFile(blob);
                    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

                    updateRow(DB_CONFIG.SHEET_NAMES.BADGES, badge.badgeId, {
                        prompt: badge.generatedPrompt,
                        driveURL: file.getDownloadUrl(),
                        status: 'ready'
                    }, 'badgeId');

                } catch (e) {
                    console.error(`Failed badge ${badge.badgeId}: ${e.message}`);
                    updateRow(DB_CONFIG.SHEET_NAMES.BADGES, badge.badgeId, { status: 'error' }, 'badgeId');
                }
            });
        } catch (e) {
            console.error('Batch fetch failed: ' + e.message);
        }
    },

    getBadge: function (badgeId) {
        return findOne(DB_CONFIG.SHEET_NAMES.BADGES, b => b.badgeId === badgeId);
    },

    getUserBadges: function (email) {
        const all = readAll(DB_CONFIG.SHEET_NAMES.BADGES);
        return all.filter(b => b.ownerEmail === email && b.status === 'ready');
    },

    getAllBadges: function () {
        return readAll(DB_CONFIG.SHEET_NAMES.BADGES);
    }
};

/**
 * Ensures a trigger exists to process badges.
 * Creates a one-time trigger if none exists.
 */
function ensureTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    const handlerName = 'processPendingBadges';

    // Check if a trigger for this function already exists
    const exists = triggers.some(t => t.getHandlerFunction() === handlerName);

    if (!exists) {
        // Create a one-time trigger to run in 1 second (approx)
        ScriptApp.newTrigger(handlerName)
            .timeBased()
            .after(100)
            .create();
    }
}

/**
 * Helper to get word list.
 * Uses CacheService to store the list for 6 hours.
 */
function getWordList() {
    const cache = CacheService.getScriptCache();
    const cached = cache.get('WORD_LIST');

    if (cached) {
        return JSON.parse(cached);
    }

    try {
        const response = UrlFetchApp.fetch(BADGE_CONFIG.WORD_LIST_URL);
        const text = response.getContentText();
        const words = text.split('\n').filter(w => w.length > 0);

        // Cache it. Max size is 100KB. 10k words is ~70KB.
        // If it's too big, we might need to slice it.
        // Let's take top 5000 just to be safe if 10k is too big for cache entry.
        // Actually, let's try full list, if it fails, fallback.
        try {
            cache.put('WORD_LIST', JSON.stringify(words), 21600); // 6 hours
        } catch (e) {
            console.warn('Word list too big for cache, slicing to 5000.');
            const sliced = words.slice(0, 5000);
            cache.put('WORD_LIST', JSON.stringify(sliced), 21600);
            return sliced;
        }

        return words;
    } catch (e) {
        console.error('Failed to fetch word list: ' + e.message);
        // Fallback list
        return ['robot', 'future', 'tech', 'space', 'cyber', 'data', 'code', 'mech', 'gear', 'volt'];
    }
}

/**
 * Helper to get or create a Drive folder.
 */
function getOrCreateFolder(folderName) {
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
        return folders.next();
    } else {
        return DriveApp.createFolder(folderName);
    }
}

/**
 * Helper to generate random base36 string.
 */
function generateBase36(length) {
    let result = '';
    const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
