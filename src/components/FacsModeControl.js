import React, { Component } from 'react'
import { Button } from '@material-ui/core';

export default class FacsModeControl extends Component {    
    render() {
        const { selected, buttonProps, onChangeView, surfaceIndex } = this.props

        return (
            <span id="FacsModeControl" >
                <Button
                    className="toolbar-button-right"
                    {...buttonProps}
                    onClick={ () => onChangeView(surfaceIndex,'detail') }
                >
                    <i className={`${ selected === 'detail' ? 'selected-action' : ''} fas fa-image fa-2x`}></i>
                </Button> 
                <Button
                    className="toolbar-button-right"
                    {...buttonProps}
                    onClick={ () => onChangeView(surfaceIndex,'index') }
                >
                    <i className={`${ selected === 'index' ? 'selected-action' : ''} fas fa-list fa-2x`}></i>
                </Button> 
            </span>
        )
    }
}

