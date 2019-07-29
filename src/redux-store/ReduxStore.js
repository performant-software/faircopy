import {createStore} from 'redux';

import rootReducer from '../redux-store/rootReducer';

// Call this once to create a new redux store that is properly configured.
export function createReduxStore() {
  let store = createStore(
    rootReducer(),
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
  );
  return store;
};

// Dispatch the action with the given parameters.
export function dispatchAction( props, action, ...params ) {
  props.dispatch( { type: action, payload: { params: params, dispatcher: { dispatch: props.dispatch } } } );
};


// Take the action and call it with the current redux state.
function reducer( state, actionFn, action ) {
  let params = (action.payload && action.payload.params) ? action.payload.params : [];
  return actionFn( state, ...params, action.payload.dispatcher );
};

function getActionFn( action, actionModule ) {
  let parts = action.split('.')
  return actionModule[parts[1]];
}

// Create a reducer that only services actions in the action set.
export function createReducer( actionModuleName, actionModule, initialState ) {

  // get the function keys from the module itself
  var actionNames = [];
  for( let action of Object.keys(actionModule) ) {
    actionNames.push(`${actionModuleName}.${action}`);
  }

  function scopedReducer(state=initialState, action, validActions=actionNames, mod=actionModule) {
    if( validActions.includes(action.type) ) {
      return reducer( state, getActionFn(action.type, mod), action );
    } else {
      return { ...state };
    }
  };

  return scopedReducer;
}
