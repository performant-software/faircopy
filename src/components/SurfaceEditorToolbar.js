import React, { Component } from 'react'
import { Button, Tooltip } from '@material-ui/core';

import FacsModeControl from './FacsModeControl';

export default class SurfaceEditorToolbar extends Component {

    constructor() {
        super()

        this.buttonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true
        }
    }

    renderActionButton( toolTip, icon, action ) {
        const { onChangeTool, selectedTool } = this.props
        const selectionClass = selectedTool === action ? 'selected-action' : ''
        const onClick = ()=>{
            onChangeTool(action)
        } 

        return (
            <Tooltip title={toolTip}>
                <span>
                    <Button
                        onClick={onClick}
                        {...this.buttonProps}
                    >
                        <i className={`fas ${selectionClass} ${icon} fa-2x`}></i>
                    </Button>  
                </span>
            </Tooltip>            
        )
    }

    render() {
        const { onChangeView, surfaceIndex, onWindow } = this.props
        return (
            <div id='SurfaceEditorToolbar' >
                { this.renderActionButton("Select Mode", "fa-mouse-pointer", "select" )}
                { this.renderActionButton("Draw Rectangle", "fa-draw-square", "rect" )}
                { this.renderActionButton("Draw Polygon", "fa-draw-polygon", "polygon" )}
                <FacsModeControl
                    surfaceIndex={surfaceIndex}
                    selected={'detail'}
                    buttonProps={this.buttonProps}
                    onChangeView={onChangeView}
                    onWindow={onWindow}
                ></FacsModeControl>
            </div>
        )
    }   
}