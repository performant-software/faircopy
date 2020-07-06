import React, { Component } from 'react'

import { Button } from '@material-ui/core'

import { eraseSelection } from "../tei-document/editor-actions"

export default class EditorToolbar extends Component {
    
    render() {
        const { onOpenElementMenu, onEditResource, teiDocument } = this.props
        const { changedSinceLastSave } = teiDocument

        const onClickSave = () => {
            teiDocument.save()
            teiDocument.refreshView()
        }

        const buttonProps = {
            disableRipple: true,
            disableFocusRipple: true
        }

        return (
            <div id="EditorToolbar">
                <div className="leftgroup">
                    <Button
                        ref={(el)=> { this.markerButtonEl = el }}
                        onClick={()=>{onOpenElementMenu('mark',this.markerButtonEl)}}
                        className="toolbar-button"
                        {...buttonProps}
                    >
                        <i className="fa fa-marker fa-2x"></i>
                    </Button> 
                    <Button
                        className="toolbar-button"
                        ref={(el)=> { this.structureButtonEl = el }}
                        onClick={()=>{onOpenElementMenu('structure',this.structureButtonEl)}}
                        {...buttonProps}
                    >
                        <i className="far fa-file fa-2x"></i>
                    </Button>    
                    <Button
                        className="toolbar-button"
                        disabled
                        {...buttonProps}
                    >
                        <i className="far fa-image fa-2x"></i>
                    </Button>  
                    <Button
                        onClick={()=>{eraseSelection(teiDocument)}}
                        className="toolbar-button"
                        {...buttonProps}
                    >
                        <i className="fas fa-eraser fa-2x"></i>
                    </Button>  
                    <Button
                        onClick={onEditResource}
                        className="toolbar-button"
                        {...buttonProps}
                    >
                        <i className="far fa-edit fa-2x"></i>
                    </Button>                   
                </div>
                <div className="rightgroup">
                    <Button
                        className="toolbar-button"
                        disabled
                        {...buttonProps}
                    >
                        <i className="fas fa-cloud-upload-alt fa-2x"></i>
                    </Button>    
                    <Button
                        onClick={onClickSave}
                        className="toolbar-button"
                        disabled={!changedSinceLastSave}
                        {...buttonProps}
                    >
                        <i className="fas fa-save fa-2x"></i>
                    </Button>  
                </div>
            </div>
        )
    }
}
