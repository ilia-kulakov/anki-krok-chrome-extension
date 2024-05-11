// Options for the observer (which mutations to observe)
const config = { childList: true };

// Callback function to execute when mutations are observed
const callback = (mutationList) => {
    for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(transferNoteData);
        }
    }
};

const transferNoteData = (el) => {
    if (el.tagName !== 'DIALOG' || !el.classList.contains('gl-dictionary')) {
        return;
    }

    const $dialog = $(el);

    chrome.runtime.sendMessage({
        term: $dialog.find('.word').first().text().trim(),
        example: $dialog.find('.example').first().text().trim(),
        iconUrl: $dialog.find('.image img').first().attr('src'),
        audioUrl: $dialog.find("[name='play']").val(),
    });
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(document.body, config);
