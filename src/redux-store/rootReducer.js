import { combineReducers } from 'redux';

import {createReducer} from './ReduxStore';
import TEIEditorState from './TEIEditorState';

import teiEditorInitialState from './initial-state/teiEditorInitialState';

export default function rootReducer() {
    return combineReducers({
        teiEditor: createReducer( 'TEIEditorState', TEIEditorState, teiEditorInitialState )
    });    
};
