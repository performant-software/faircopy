import React from 'react';
import ReactDOM from 'react-dom';
import App from './render/components/App';
import './render/css/index.css';

ReactDOM.render(<App/>, document.getElementById('root'));

console.log('👋 This message is being logged by "renderer.js", included via webpack');
