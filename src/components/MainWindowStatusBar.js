import React, { Component } from 'react'

import { AppBar, Button } from '@material-ui/core';

export default class MainWindowStatusBar extends Component {

    render() {
        return (
            <AppBar id="MainWindowStatusBar" position="fixed" >
                <div className="bar">
                   <Button className="version-button" size="small" variant="outlined" color="inherit">v0.9.1</Button>
                </div>
            </AppBar>
        )
    }

}