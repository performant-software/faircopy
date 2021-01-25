import React, { Component } from 'react'
import { Button } from '@material-ui/core';

import FacsModeControl from './FacsModeControl';

export default class SurfaceEditorToolbar extends Component {

    render() {
        const { onChangeView, surfaceIndex, onDrawSquare, onSelectMode } = this.props
        
        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div className='top-bar' >
                <Button
                    onClick={onSelectMode}
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-mouse-pointer fa-2x"></i>
                </Button>
                <Button
                    onClick={onDrawSquare}
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-square fa-2x"></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-polygon fa-2x"></i>
                </Button> 
                <Button
                    disabled
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-eraser fa-2x"></i>
                </Button> 
                <FacsModeControl
                    surfaceIndex={surfaceIndex}
                    selected={'detail'}
                    buttonProps={buttonProps}
                    onChangeView={onChangeView}
                ></FacsModeControl>
            </div>
        )
    }   
}