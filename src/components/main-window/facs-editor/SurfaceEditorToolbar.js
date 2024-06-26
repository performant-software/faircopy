import React, { Component } from 'react'
import { Button, Tooltip } from '@material-ui/core';

import FacsModeControl from './FacsModeControl';

export default class SurfaceEditorToolbar extends Component {

    constructor() {
        super()

        this.buttonProps = {
            className: 'toolbar-button'
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
                        <i className={`${selectionClass} ${icon} fa-2x`}></i>
                    </Button>  
                </span>
            </Tooltip>            
        )
    }

    render() {
        const { onChangeView, surfaceIndex, editable, onWindow, onEditSurfaceInfo } = this.props
        return (
            <div id='SurfaceEditorToolbar' >
                { editable && <span>
                    { this.renderActionButton("Select Mode", "fa-solid fa-arrow-pointer", "select" )}
                    { this.renderActionButton("Draw Rectangle", "fa-regular fa-square", "rect" )}
                    { this.renderActionButton("Draw Polygon", "fa-solid fa-draw-polygon", "polygon" )}
                    <Tooltip title="Edit Surface Properties">
                        <span>
                            <Button
                                onClick={onEditSurfaceInfo}
                                {...this.buttonProps}
                            >
                                <i className="far fa-edit fa-2x"></i>
                            </Button>                   
                        </span>
                    </Tooltip>
                </span> }
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