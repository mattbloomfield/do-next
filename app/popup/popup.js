const globalVar = {};

function init() {

    chrome.storage.sync.get({ tasks: [], limit: 4, badge: true, theme: 'light' }, function (data) {
        console.log('save data', data);
        const tasks = data.tasks;
        globalVar.limit = data.limit;
        globalVar.badge = data.badge;
        renderTheme(data.theme);
        document.getElementById('Limit').innerHTML = globalVar.limit;
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];
            addTask(t.text, t.completed, t.id);
        }
        new Sortable(document.getElementById('List'), {
            animation: 150,
            ghostClass: 'blue-background-class',
            onEnd: function () {
                autosave()
            }
        });
        checkLimit();
    });

    chrome.storage.sync.get('rollover', data => {
        const rollover = data.rollover;
        document.getElementById('RolloverTasks').checked = data.rollover;
    });

}

const renderTheme = (theme) => {
    const link = document.createElement("link");
    link.href = `theme.${theme}.css`;
    link.type = "text/css";
    link.rel = "stylesheet";
    link.media = "screen,print";
    document.getElementsByTagName("head")[0].appendChild(link);
}

document.getElementById('AddNewForm').addEventListener('submit', event => {
    event.preventDefault()
    const form = event.currentTarget;
    const task = form.querySelector('#NewTask').value;
    addTask(task);
    autosave();
    form.querySelector('#NewTask').value = '';
    return false;
});

document.getElementById('NewDayForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!confirm('Click OK to clear completed tasks and begin a new day')) {
        return;
    }
    await saveCompletedTasks();
    const tasks = getNewDayTasks();
    const list = document.getElementById('List');
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        addTask(t.text, t.completed, t.id);
    }
    autosave();
});

document.getElementById('RolloverTasks').addEventListener('change', event => {
    chrome.storage.sync.set({ rollover: event.currentTarget.checked }, function () {
        console.log('saved rollover', event.currentTarget.checked);
    });
});

document.getElementById('ShowCompletedButton').addEventListener('click', event => {
    const list = document.getElementById('CompletedList');
    if (document.getElementById('ShowCompletedButton').innerHTML == 'Hide Completed Tasks') {
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
        document.getElementById('ShowCompletedButton').innerHTML = 'Show Completed Tasks';
        document.getElementById('ListDivider').style.display = 'none';
    } else {
        chrome.storage.sync.get('completedTasks', data => {
            const completedTasks = data.completedTasks;
            completedTasks.forEach(task => {
                addTask(task.text, task.completed, task.id, 'CompletedList', task.completedDate);
            });
        });
        document.getElementById('ShowCompletedButton').innerHTML = 'Hide Completed Tasks';
        document.getElementById('ListDivider').style.display = 'block';

    }
});
document.getElementById('ClearHistoryButton').addEventListener('click', event => {
    if (!confirm('Clicking OK will clear all completed tasks from your history. This is not recoverable')) {
        return;
    }
    const list = document.getElementById('CompletedList');
    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }
    document.getElementById('ShowCompletedButton').innerHTML = 'Show Completed Tasks';
    document.getElementById('ListDivider').style.display = 'none';
    chrome.storage.sync.set({ completedTasks: [] }, function () {
    });
});

function saveCompletedTasks() {
    return new Promise(resolve => {
        const taskEls = document.querySelectorAll('#List .task');
        chrome.storage.sync.get('completedTasks', data => {
            const completedTasks = data.completedTasks || [];
            for (let i = 0; i < taskEls.length; i++) {
                const t = taskEls[i];
                let completed = t.classList.contains('completed');
                if (completed) {
                    completedTasks.push({
                        text: t.querySelector('span').innerHTML,
                        completed: completed,
                        id: t.getAttribute('id'),
                        completedDate: t.getAttribute('completion-date')
                    });
                }
            }
            chrome.storage.sync.set({ completedTasks: completedTasks }, function () {
                resolve();
            });
        });
    });
}

function getNewDayTasks() {
    const newTasks = [];
    const rollover = document.getElementById('RolloverTasks').checked;
    if (!rollover) {
        return newTasks;
    }
    const taskEls = document.querySelectorAll('#List .task');
    for (let i = 0; i < taskEls.length; i++) {
        const t = taskEls[i];
        let completed = t.classList.contains('completed');
        if (!completed) {
            newTasks.push({
                text: t.querySelector('span').innerHTML,
                completed: completed,
                id: t.getAttribute('id')
            });
        }
    }
    return newTasks;
}

// Saving

function autosave() {
    const tasks = [];
    const taskEls = document.querySelectorAll('#List .task');
    for (let i = 0; i < taskEls.length; i++) {
        const t = taskEls[i];
        const completed = t.classList.contains('completed')
        const text = t.querySelector('span').innerHTML;
        const id = t.getAttribute('id');
        console.log('text', text);
        tasks.push({
            text: text,
            completed: completed,
            id: id
        });
    }
    console.log('saving', tasks);
    chrome.storage.sync.set({ tasks: tasks }, function () {
        console.log('saved');
        checkLimit();
    });
}

function checkLimit() {
    const taskEls = document.querySelectorAll('#List .task');
    if (taskEls.length < globalVar.limit) {
        document.getElementById('AddNewForm').style.display = 'flex';
    } else {
        document.getElementById('AddNewForm').style.display = 'none';
    }
    let completedCount = 0;
    for (let i = 0; i < taskEls.length; i++) {
        if (!taskEls[i].classList.contains('completed')) completedCount++;
    }
    if (globalVar.badge) {
        chrome.browserAction.setBadgeText({ text: completedCount.toString() });
    } else {
        chrome.browserAction.setBadgeText({ text: '' });
    }
}

const addTask = (task, completed, taskId = `TASK_${new Date().getTime()}`, locationId = 'List', completionDate) => {
    const taskEl = document.createElement('li');
    taskEl.className = 'task';
    if (completed) {
        taskEl.className += ' completed';
    }
    taskEl.id = taskId;

    const taskText = document.createElement('span');
    taskText.innerHTML = task;

    const btnContainer = document.createElement('div');
    btnContainer.className = 'buttons';

    taskEl.append(taskText);

    if (completionDate) {
        console.log('completionDate', completionDate);
        const date = new Date(parseInt(completionDate));
        console.log('date', date);
        const dateEl = document.createElement('span');
        dateEl.innerHTML = `Completed: ${date.toLocaleString("en-US")}`;
        btnContainer.append(dateEl);
    } else {

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.setAttribute('task-id', taskId);
        editBtn.className = 'btn btn-edit fa fa-pencil';
        editBtn.addEventListener('click', editTask);

        const finishBtn = document.createElement('button');
        finishBtn.type = 'button';
        finishBtn.setAttribute('task-id', taskId);
        finishBtn.className = 'btn btn-primary fa fa-check';
        finishBtn.addEventListener('click', finishTask);

        const trashBtn = document.createElement('button');
        trashBtn.type = 'button';
        trashBtn.setAttribute('task-id', taskId);
        trashBtn.className = 'btn btn-danger fa fa-trash';
        trashBtn.addEventListener('click', trashTask);

        btnContainer.append(editBtn);
        btnContainer.append(finishBtn);
        btnContainer.append(trashBtn);
    }
    taskEl.append(btnContainer);
    document.getElementById(locationId).append(taskEl);
}

const editTask = event => {
    const taskId = event.currentTarget.getAttribute('task-id');
    document.getElementById(taskId).setAttribute('contenteditable', true);
    document.getElementById(taskId).addEventListener('blur', event => {
        event.currentTarget.setAttribute('contenteditable', false);
        event.currentTarget.removeEventListener('blur');
    });
    autosave();
}

const finishTask = event => {
    const taskId = event.currentTarget.getAttribute('task-id');
    const task = document.getElementById(taskId)
    task.classList.toggle('completed');
    task.setAttribute('completion-date', new Date().getTime());
    task.querySelector('.btn-danger').setAttribute('disabled', 'disabled');
    document.getElementById('List').append(task);
    autosave();
}

const trashTask = event => {
    event.currentTarget.parentNode.parentNode.remove();
    autosave();
}

init();