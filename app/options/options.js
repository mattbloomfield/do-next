// Saves options to chrome.storage
function save_options() {
    const limit = parseInt(document.getElementById('Limit').value);
    const badge = document.getElementById('Badge').checked;
    const themeSelector = document.getElementById('Theme');
    const theme = themeSelector.options[themeSelector.selectedIndex].value;
    chrome.storage.sync.set({
        limit: limit,
        badge: badge,
        theme: theme,
    }, () => {
        const status = document.getElementById('Status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 750);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get({
        limit: 4,
        badge: true,
        theme: 'light',
    }, data => {
        document.getElementById('Limit').value = data.limit;
        document.getElementById('Badge').checked = data.badge;
        document.getElementById('Theme').querySelector(`option[value=${data.theme}`).setAttribute('selected', 'selected');
    });
}
document.addEventListener('DOMContentLoaded', restore_options);

document.getElementById('Limit').addEventListener('blur',
    save_options);

document.getElementById('Badge').addEventListener('change',
    () => {
        save_options();
        if (!document.getElementById('Badge').checked) {
            chrome.browserAction.setBadgeText({ text: '' });
        }
    });

document.getElementById('Theme').addEventListener('change',
    save_options);