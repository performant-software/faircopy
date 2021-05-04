import React, { Component } from 'react'

import { IconButton, Tooltip } from '@material-ui/core'

import {undo, redo} from "prosemirror-history"
import { eraseSelection } from "../tei-document/editor-actions"

export default class EditorToolbar extends Component {
    
    constructor() {
        super()
        this.state = {
        }

        this.buttonProps = {
            className: 'toolbar-button',
            disableRipple: true,
            disableFocusRipple: true
        }
    }

    getEnabledMenus() {
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()

        if( editorView ) {
            const { selection } = editorView.state
            if( selection.$cursor ) {
                return {
                    marks: false,
                    inline: true,
                    eraser: false
                }
            } else {
                    return {
                        marks: true,
                        inline: false,
                        eraser: true
                    }
            }
        } 
        return {
            marks: false,
            inline: false,
            eraser: false
        }
    }

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
        const enabledMenus = this.getEnabledMenus()

        return (
            <span>
                { this.renderButton("Toggle Element Palette", "fas fa-palette", onTogglePalette ) }
                { this.renderButton(
                    "Mark Phrase",
                    "fas fa-marker",
                    () => { onOpenElementMenu({ menuGroup: 'mark' })},
                    enabledMenus.marks,
                    (el)=> { elementMenuAnchors.mark = el }
                )}
                { this.renderButton(
                    "Insert Inline",
                    "fas fa-stamp",
                    () => { onOpenElementMenu({ menuGroup: 'inline' }) },
                    enabledMenus.inline,
                    (el)=> { elementMenuAnchors.inline = el }
                )}
                { this.renderButton("Erase Marks", "fas fa-eraser", ()=>{eraseSelection(teiDocument)}, enabledMenus.eraser) }
            </span>
        )
    }

    onUndo = () => {
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()
        undo(editorView.state,editorView.dispatch)
    }

    onRedo = () => {
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()
        redo(editorView.state,editorView.dispatch)
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
                    { this.renderButton("Undo", "fas fa-undo", this.onUndo ) }
                    { this.renderButton("Redo", "fas fa-redo", this.onRedo ) }                          
                </div>
                <div className="rightgroup">
                    { this.renderButton("Edit Properties", "fas fa-edit", onEditResource ) }
                    { this.renderButton("Save", "fas fa-save", onSave, changedSinceLastSave ) }
                </div>
            </div>
        )
    }
}
