import React, { Component } from 'react'

import { IconButton, Tooltip } from '@material-ui/core'

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

    getEnabledMenus() {
        const { selectedAction } = this.state
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()

        if( editorView ) {
            if( selectedAction === 'info' ) {
                return {
                    marks: true,
                    structures: true,
                    inline: true,
                    eraser: false
                }
            } else {
                const { selection } = editorView.state
                if( selection.$cursor ) {
                    return {
                        marks: false,
                        structures: false,
                        inline: true,
                        eraser: false
                    }
                } else {
                    if( selection.node ) {
                        return {
                            marks: false,
                            structures: true,
                            inline: (selectedAction === 'addAbove' || selectedAction === 'addBelow'),
                            eraser: false
                        }
                    } else {
                        return {
                            marks: true,
                            structures: true,
                            inline: false,
                            eraser: true
                        }
                    } 
                }
            }
        } 
        return {
            marks: false,
            structures: false,
            inline: false,
            eraser: false
        }
    }

    // renderActionButton( toolTip, icon, action ) {
    //     const { selectedAction } = this.state
    //     const selectionClass = selectedAction === action ? 'selected-action' : ''
    //     const onClick = ()=>{this.setState({...this.state, selectedAction: action})} 

    //     return (
    //         <Tooltip title={toolTip}>
    //             <span>
    //                 <Button
    //                     onClick={onClick}
    //                     {...this.buttonProps}
    //                 >
    //                     <i className={`far ${selectionClass} ${icon} fa-2x`}></i>
    //                 </Button>  
    //             </span>
    //         </Tooltip>            
    //     )
    // }

    // renderActionButtons() {
    //     const { teiDocument } = this.props
    //     const enabledMenus = this.getEnabledMenus()

    //     return (
    //         <div style={{display: 'inline-block'}}>
    //             { this.renderActionButton("Replace Element", 'fa-crosshairs', 'replace' ) }
    //             { this.renderActionButton("Add Element Above", 'fa-arrow-to-top', 'addAbove') }
    //             { this.renderActionButton("Add Element Below",  'fa-arrow-to-bottom', 'addBelow') }
    //             { this.renderActionButton("Add Element Outside", 'fa-arrow-to-left', 'addOutside') }
    //             { this.renderActionButton("Add Element Inside", 'fa-arrow-to-right', 'addInside') }
    //             { this.renderActionButton("View Element Description", 'fa-info-circle', 'info') }
    //         </div>
    //     )
    // }

    // renderElementMenuButton( toolTip, icon, disabled, onRef, onClick ) {
    //     return (
    //         <Tooltip title={toolTip}>
    //             <span>
    //                 <IconButton
    //                     disabled={disabled}
    //                     ref={onRef}
    //                     onClick={onClick}
    //                     {...this.buttonProps}
    //                 >
    //                     <i className={`far ${icon} fa-sm`}></i>
    //                 </IconButton> 
    //             </span>
    //         </Tooltip>
    //     )
    // }

    renderButton(title,icon,onClick,enabled=true,onRef=null) {
        const refProps = onRef ? { ref: onRef } : {}
        const iconButton = (
            <IconButton
                disabled={!enabled}
                onClick={onClick}
                {...this.buttonProps}
                {...refProps}
            >
                <i className={`${icon} fa-sm`}></i>
            </IconButton> 
        )
             
        return enabled ? <Tooltip title={title}>{iconButton}</Tooltip> : iconButton
    }

    renderActionButtons() {
        const { onOpenElementMenu, teiDocument, onTogglePalette, elementMenuAnchors } = this.props
        const { selectedAction } = this.state
        const enabledMenus = this.getEnabledMenus()

        return (
            <span>
                { this.renderButton("Toggle Element Palette", "fas fa-palette", onTogglePalette ) }
                { this.renderButton(
                    "Mark Phrase",
                    "fas fa-marker",
                    () => { onOpenElementMenu({ menuGroup: 'mark', action: selectedAction})},
                    enabledMenus.marks,
                    (el)=> { elementMenuAnchors.mark = el }
                )}
                { this.renderButton(
                    "Insert Inline",
                    "fas fa-stamp",
                    () => { onOpenElementMenu({ menuGroup: 'inline', action: selectedAction }) },
                    enabledMenus.inline,
                    (el)=> { elementMenuAnchors.inline = el }
                )}
                { this.renderButton("Erase Marks", "fas fa-eraser", ()=>{eraseSelection(teiDocument)}, enabledMenus.eraser) }
            </span>
        )
    }

    render() {
        const { onEditResource, onSave, teiDocument } = this.props
        const { changedSinceLastSave } = teiDocument

         // TODO
         const noOp = () => {}
         const seperator = <div className="seperator"><div className="line"></div></div>

         return (
            <div id="EditorToolbar">
                <div className="leftgroup">
                    { this.renderActionButtons() }
                    { seperator }
                    { this.renderButton("Bold", "fas fa-bold", noOp ) }
                    { this.renderButton("Italic", "fas fa-italic", noOp ) }
                    { this.renderButton("Underline", "fas fa-underline", noOp ) }
                    { this.renderButton("Reference", "fas fa-link", noOp ) }
                    { this.renderButton("Note", "far fa-comment-alt", noOp ) }
                    { seperator }
                    { this.renderButton("Undo", "fas fa-undo", noOp ) }
                    { this.renderButton("Redo", "fas fa-redo", noOp ) }                          
                </div>
                <div className="rightgroup">
                    { this.renderButton("Edit Properties", "fas fa-edit", onEditResource ) }
                    { this.renderButton("Save", "fas fa-save", onSave, changedSinceLastSave ) }
                </div>
            </div>
        )
    }
}
