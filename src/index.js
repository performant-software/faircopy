import React from 'react';
import ReactDOM from 'react-dom';
import FairCopyWindow from './components/FairCopyWindow';
import {createReduxStore} from './redux-store/ReduxStore';

ReactDOM.render(<FairCopyWindow store={createReduxStore()}/>, document.getElementById('root'));