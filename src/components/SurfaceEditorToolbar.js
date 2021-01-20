import React, { Component } from 'react'
import { Button } from '@material-ui/core';

import FacsModeControl from './FacsModeControl';

export default class SurfaceEditorToolbar extends Component {

    render() {
        const { onChangeView, surfaceIndex, onDrawSquare } = this.props
        
        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div className='top-bar' >
                <Button
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-mouse-pointer fa-2x"></i>
                </Button>
                <Button
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-expand fa-2x"></i>
                </Button>  
                <Button
                    onClick={onDrawSquare}
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-square fa-2x"></i>
                </Button> 
                <Button
                    className="toolbar-button"
                    {...buttonProps}
                >
                    <i className="fas fa-draw-polygon fa-2x"></i>
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