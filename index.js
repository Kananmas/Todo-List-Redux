function kindOf(inp) {
    return Object.prototype.toString.call(inp).slice(8, -1).toLowerCase();
}

function createStore(reducer, initalstate) {
    if (kindOf(reducer) !== 'function') {
        throw new Error('Reducer is not a function,but a ' + kindOf(reducer));
    }
    if (kindOf(initalstate) === 'function') {
        throw new Error(`initialstate couldn't be a function`)
    }

    let state = initalstate;
    let isDispached = false;
    let subscribtions = [];

    function dispatch(action) {
        if (kindOf(action) !== 'object') {
            throw new Error(`${action} is not an object`);
        }
        if (!('type' in action)) {
            throw new Error('action dose not have the property of type');
        }

        if (isDispached) {
            throw new Error('cannot do anything while processing');
        }

        try {
            isDispached = true;
            state = reducer(state, action);

        } finally {
            isDispached = false;
            broadcast();
        }
    }

    function broadcast() {
        for (const subscribtion of subscribtions) {
            subscribtion();
        }
    }

    function subscribe(listener) {
        subscribtions.push(listener);

        return function unsubscribe() {
            let listenerIndex = subscribtions.indexOf(listener);
            if (listenerIndex >= 0) {
                subscribtions.splice(listenerIndex, 1);
            }
        }
    }

    dispatch({
        type: '@INIT'
    })

    function getState() {
        if (isDispached) {
            throw new Error('cannot show state while processing');
        }
        return state;
    }

    return {
        dispatch,
        getState,
        subscribe,
    }

}

function shapeCheckValid(reducers) {
    for (const key in reducers) {
        let reducer = reducers[key];
        let action = {
            type: '@INIT'
        }
        let action2 = {
            type: Math.random().toString(6).slice(2),
        }
        if (kindOf(reducer(undefined, action)) === 'undefined' || kindOf(reducer(undefined, action2)) === 'undefined') {
            throw new Error('action is not an type of undefined');
        }
    }
}

function combineReducers(reducers) {
    if (kindOf(reducers) !== 'object') {
        throw new Error('reducers should be stroed in an object');
    }
    let finalreducers = {};
    for (const reducerKey in reducers) {
        const reducer = reducers[reducerKey];

        if ((kindOf(reducer) === 'function')) {
            finalreducers[reducerKey] = reducer;
        }
    }

    let shapeError;
    try {
        shapeCheckValid(finalreducers);
    } catch (error) {
        shapeError = error;
    }

    return (state = {}, action) => {
        if (shapeError) { throw new Error(shapeError); }

        let nextState = state;
        let hasChanged = false;
        let target = action.target;
        if (target) {
            if (target in finalreducers) {
                let targetReducer = finalreducers[target];
                let reducerState = state[target] || undefined;
                let reducerNewState = targetReducer(reducerState, action)
                hasChanged = (reducerNewState !== reducerState);
                nextState[target] = hasChanged ? reducerNewState : reducerState;
            }
            return nextState;
        }
        else {
            if (action.type === '@INIT' || action.target === '*') {
                for (const reducerKey in finalreducers) {
                    const reducer = finalreducers[reducerKey];
                    const reducerState = state[reducerKey] || undefined;
                    const newReducerState = reducer(reducerState, action);

                    hasChanged = hasChanged || reducerState !== newReducerState;
                    nextState[reducerKey] = newReducerState;
                }

                return hasChanged ? nextState : state;
            }
            throw new Error('action must have the property of type')
        }
    }
}



function taskReducer(initalstate = [], action) {
    let state = [...initalstate];
    switch (action.type) {
        case 'ADD_TASK':
            state.push(action.payload);
            break;
        case 'REMOVE_TASK':
            state = state.filter((i) => {
                if (i.id !== action.payload.id)
                    return i;
            })
            break;
        case "DONE":
            state = state.filter((i) => {
                if (i.id == action.payload.id) { i.done = true; }
                return i;
            })
            break;
        case "NOT_DONE":
            state = state.filter((i) => {
                if (i.id == action.payload.id) { i.done = false; }
                return i;

            })
    }
    return state;
}

let store = createStore(taskReducer, []);

let addbtn = document.getElementById('ADD')

addbtn.addEventListener('click', () => {
    let textInput = document.getElementById('task-input');
    if (textInput.value.length) {
        let previous = store.getState().filter(i => i.task);
        let currentStore = store.getState();
        let task = " " + textInput.value;
        let id = !currentStore.length ? 1 : currentStore[currentStore.length - 1].id + 1;
        let action = { type: 'ADD_TASK', payload: { task, id, done: false } }
        store.dispatch(action);
        renderTasks(previous);
        textInput.value = null;
    }
}, false)

function renderTasks(previous = []) {
    let tasks = store.getState();
    let todolist = document.getElementById('Todo-list');

    for (let i = 0; i < tasks.length; i++) {
        if (!previous.includes(tasks[i]) || i >= previous.length) {
            let div = document.createElement('div');
            div.classList.add('todo-item')
            div.id = tasks[i].id;
            div.style.backgroundColor = i % 2 === 0 ? 'white' : 'silver';

            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox'
            checkbox.classList.add('todo-check');
            checkbox.id = 'todo-check';

            checkbox.addEventListener('change', () => {
                let target = document.getElementById(tasks[i].id)

                if (!tasks[i].done) {
                    store.dispatch({ type: "DONE", payload: { id: tasks[i].id } })
                    target.style.textDecoration = 'line-through'
                }
                else {
                    store.dispatch({ type: "NOT_DONE", payload: { id: tasks[i].id } })
                    target.style.textDecoration = 'none'
                }
            })

            let textnode = document.createElement('span');
            textnode.textContent = tasks[i].task;
            let removebtn = document.createElement('button');
            removebtn.textContent = 'x';
            removebtn.id = 'remove-item';

            removebtn.addEventListener('click', () => {
                store.dispatch({ type: 'REMOVE_TASK', payload: { id: tasks[i].id } });
                let element = document.getElementById(tasks[i].id)
                let parentNode = element.parentElement;

                parentNode.removeChild(element);
            },)

            div.appendChild(checkbox);
            div.appendChild(textnode);
            div.appendChild(removebtn);

            todolist.append(div);
        }
    }
}

let unsubscribe = store.subscribe(() => {
    console.log(store.getState())
})


