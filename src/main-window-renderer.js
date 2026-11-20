import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider } from '@material-ui/core';
import muiTheme from './muiTheme';
import App from './render/components/App';

import './render/css/index.css';
import './render/css/fontawesome/css/all.css';

ReactDOM.render(
  <ThemeProvider theme={muiTheme}>
    <App rootComponent="MainWindow" />
  </ThemeProvider>,
  document.getElementById('root'),
);
