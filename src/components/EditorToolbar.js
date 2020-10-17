import React, { Component } from 'react'

import { Button, Tooltip } from '@material-ui/core'

import { eraseSelection } from "../tei-document/editor-actions"

export default class EditorToolbar extends Component {
    
    constructor() {
        super()
        this.state = {
            selectedAction: "replace"
        }

        this.buttonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true
        }
    }

    getEnabledMenu() {
        const { teiDocument } = this.props
        const { selectedAction } = this.state
        const editorView = teiDocument.getActiveView()
        if( editorView ) {
            if( selectedAction === 'info' ) return "all"
            const { selection } = editorView.state
            if( selection.node ) {
                return "structures"
            } else {
                if( selection.empty ) {
                    return "inlines"
                } else {
                    return "marks"
                }
            }    
        } 
        return null
    }

    renderActionButton( toolTip, icon, action ) {
        const { selectedAction } = this.state
        const selectionClass = selectedAction === action ? 'selected-action' : ''
        const onClick = ()=>{this.setState({...this.state, selectedAction: action})} 

        return (
            <Tooltip title={toolTip}>
                <span>
                    <Button
                        onClick={onClick}
                        {...this.buttonProps}
                    >
                        <i className={`far ${selectionClass} ${icon} fa-2x`}></i>
                    </Button>  
                </span>
            </Tooltip>            
        )
    }

    renderActionButtons() {
        const { teiDocument } = this.props
        const eraseDisabled = this.getEnabledMenu() !== 'marks'

        return (
            <div style={{display: 'inline-block'}}>
                { this.renderActionButton("Replace Element", 'fa-crosshairs', 'replace' ) }
                { this.renderActionButton("Add Element Above", 'fa-arrow-to-top', 'addAbove') }
                { this.renderActionButton("Add Element Below",  'fa-arrow-to-bottom', 'addBelow') }
                { this.renderActionButton("Add Element Outside", 'fa-arrow-to-left', 'addOutside') }
                { this.renderActionButton("Add Element Inside", 'fa-arrow-to-right', 'addInside') }
                { this.renderActionButton("View Element Description", 'fa-info-circle', 'info') }
                <Tooltip title="Erase Marks">
                    <span>
                        <Button
                            disabled={eraseDisabled}
                            onClick={()=>{eraseSelection(teiDocument)}}
                            {...this.buttonProps}
                        >
                            <i className="fas fa-eraser fa-2x"></i>
                        </Button>                          
                    </span>
                </Tooltip>
            </div>
        )
    }

    renderElementMenuButton( toolTip, icon, disabled, onRef, onClick ) {
        return (
            <Tooltip title={toolTip}>
                <span>
                    <Button
                        disabled={disabled}
                        ref={onRef}
                        onClick={onClick}
                        {...this.buttonProps}
                    >
                        <i className={`far ${icon} fa-2x`}></i>
                    </Button> 
                </span>
            </Tooltip>
        )
    }

    renderElementMenuButtons() {
        const { onOpenElementMenu, teiDocument } = this.props
        const { selectedAction } = this.state
        const { fairCopyProject } = teiDocument

        const onClickMarker = () => {
            const { menus } = fairCopyProject
            const menuGroups = menus['mark']
            onOpenElementMenu({ menuGroups, anchorEl: this.markerButtonEl, action: 'create'})
        }

        const onClickStructure = () => {
            const { menus } = fairCopyProject
            const menuGroups = menus['structure']
            onOpenElementMenu({ menuGroups, anchorEl: this.structureButtonEl, action: selectedAction })
        }

        const enabledMenu = this.getEnabledMenu()

        return (
            <div style={{display: 'inline-block'}}>
                { this.renderElementMenuButton(
                    "Marks",
                    "fa-marker",
                    (enabledMenu !== 'all' && enabledMenu !== 'marks'),
                    (el)=> { this.markerButtonEl = el },
                    onClickMarker
                )}
                { this.renderElementMenuButton(
                    "Structures",
                    "fa-page-break",
                    (enabledMenu !== 'all' && enabledMenu !== 'structures'),
                    (el)=> { this.structureButtonEl = el },
                    onClickStructure
                )}
                { this.renderElementMenuButton(
                    "Inlines",
                    "fa-anchor",
                    (enabledMenu !== 'all' && enabledMenu !== 'inlines'),
                    ()=> {},
                    ()=> {},
                )}
            </div>
        )
    }

    render() {
        const { onEditResource, onSave, teiDocument } = this.props
        const { changedSinceLastSave } = teiDocument
        
        return (
            <div id="EditorToolbar">
                <div className="leftgroup">
                    { this.renderElementMenuButtons() }
                    { this.renderActionButtons() }
                    <Tooltip title="Edit Document Properties">
                        <span>
                            <Button
                                onClick={onEditResource}
                                {...this.buttonProps}
                            >
                                <i className="far fa-edit fa-2x"></i>
                            </Button>                   
                        </span>
                    </Tooltip>
                </div>
                <div className="rightgroup">
                    <Tooltip title={"Save Document"}>
                        <span>
                            <Button
                                onClick={onSave}
                                disabled={!changedSinceLastSave}
                                {...this.buttonProps}
                            >
                                <i className="fas fa-save fa-2x"></i>
                            </Button>  
                        </span>
                    </Tooltip>
                </div>
            </div>
        )
    }
}
