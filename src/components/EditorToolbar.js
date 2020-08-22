import React, { Component } from 'react'

import { Button } from '@material-ui/core'

import { eraseSelection } from "../tei-document/editor-actions"

export default class EditorToolbar extends Component {
    
    render() {
        const { onOpenElementMenu, onEditResource, teiDocument } = this.props
        const { changedSinceLastSave, fairCopyProject } = teiDocument

        const onClickSave = () => {
            teiDocument.save()
            teiDocument.refreshView()
        }

        const onClickMarker = () => {
            const { menus } = fairCopyProject
            const menuGroups = menus['mark']
            onOpenElementMenu({ menuGroups, anchorEl: this.markerButtonEl, action: 'create'})
        }

        const onClickStructure = () => {
            const { menus } = fairCopyProject
            const menuGroups = menus['structure']
            onOpenElementMenu({ menuGroups, anchorEl: this.structureButtonEl, action: 'create'})
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
                        onClick={onClickMarker}
                        className="toolbar-button"
                        {...buttonProps}
                    >
                        <i className="far fa-marker fa-2x"></i>
                    </Button> 
                    <Button
                        className="toolbar-button"
                        ref={(el)=> { this.structureButtonEl = el }}
                        onClick={onClickStructure}
                        {...buttonProps}
                    >
                        <i className="far fa-page-break fa-2x"></i>
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
