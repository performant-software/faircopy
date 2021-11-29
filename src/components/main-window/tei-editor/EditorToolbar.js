import React, { Component } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { IconButton, Tooltip } from '@material-ui/core'

import {undo, redo} from "prosemirror-history"
import { createPhraseElement, eraseSelection } from "../../../model/editor-actions"

export default class EditorToolbar extends Component {
    
    constructor() {
        super()
        this.state = {
        }

        this.buttonProps = {
            className: 'toolbar-button'
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
            } else if( selection.node ) {
                return {
                    marks: false,
                    inline: false,
                    eraser: true
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

    renderButton(title,icon,onClick,enabled=true,onRef=null,active=false) {
        const refProps = onRef ? { ref: onRef } : {}
        const colorProps = active ? { color: 'primary' } : {}
        const iconButton = (
            <IconButton
                disabled={!enabled}
                onClick={onClick}
                {...this.buttonProps}
                {...refProps}
                {...colorProps}
            >
                <i className={`${icon} fa-sm`}></i>
            </IconButton> 
        )
             
        return <Tooltip title={title}>{iconButton}</Tooltip>
    }

    renderActionButtons() {
        const { onOpenElementMenu, teiDocument, onTogglePalette, paletteActive, elementMenuAnchors } = this.props
        const enabledMenus = this.getEnabledMenus()

        return (
            <span>
                { this.renderButton("Toggle Element Palette", "fas fa-palette", onTogglePalette, true, null, paletteActive ) }
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
                { this.renderButton("Erase Mark/Structure", "fas fa-eraser", ()=>{eraseSelection(teiDocument)}, enabledMenus.eraser) }
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

    createMark = (elementID, attrs) => {
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()

        if( editorView ) {
            const { selection } = editorView.state
            if( selection.$cursor ) {
                // TODO
            } else {
                createPhraseElement( elementID, attrs, teiDocument )
            }        
        }
    }

    onNote = () => {
        const { teiDocument } = this.props
        const editorView = teiDocument.getActiveView()

        if( editorView ) {
            const { selection } = editorView.state
            if( selection.$cursor ) {
                createPhraseElement( 'note', {}, teiDocument ) 
            } else {
                const noteID = `note_${uuidv4().replaceAll('-','')}`
                this.createMark('ref', { target: noteID }, teiDocument )
                createPhraseElement( 'note', {'xml:id': noteID}, teiDocument )
            }
        }
    }

    render() {
        const { onEditResource, onSave, teiDocument } = this.props
        const { changedSinceLastSave } = teiDocument

         const seperator = <div className="seperator"><div className="line"></div></div>

         const onBold = ()=> { this.createMark('hi', {rend: 'bold'})}
         const onItalic = ()=> { this.createMark('hi', {rend: 'italic'})}
         const onUnderline = ()=> { this.createMark('hi',{rend:'underline'})}
         const onRef = ()=> { this.createMark('ref',{})}

         return (
            <div id="EditorToolbar">
                <div className="leftgroup">
                    { this.renderActionButtons() }
                    { seperator }
                    { this.renderButton("Bold", "fas fa-bold", onBold ) }
                    { this.renderButton("Italic", "fas fa-italic", onItalic ) }
                    { this.renderButton("Underline", "fas fa-underline", onUnderline ) }
                    { this.renderButton("Reference", "fas fa-link", onRef ) }
                    { this.renderButton("Note", "far fa-comment-alt", this.onNote ) }
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
