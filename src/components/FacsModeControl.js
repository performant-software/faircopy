import React, { Component } from 'react'
import { Button } from '@material-ui/core';

export default class FacsModeControl extends Component {    
    render() {
        const { selected, buttonProps, onChangeMode } = this.props

        return (
            <span id="FacsModeControl" >
                <Button
                    className="toolbar-button-right"
                    {...buttonProps}
                    onClick={ () => onChangeMode('detail') }
                >
                    <i className={`${ selected === 'detail' ? 'selected-action' : ''} fas fa-square fa-2x`}></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button-right"
                    {...buttonProps}
                    onClick={ () => onChangeMode('grid') }
                >
                    <i className={`${ selected === 'grid' ? 'selected-action' : ''} fas fa-th-large fa-2x`}></i>
                </Button> 
                <Button
                    className="toolbar-button-right"
                    {...buttonProps}
                    onClick={ () => onChangeMode('index') }
                >
                    <i className={`${ selected === 'index' ? 'selected-action' : ''} fas fa-list fa-2x`}></i>
                </Button> 
            </span>
        )
    }
}

