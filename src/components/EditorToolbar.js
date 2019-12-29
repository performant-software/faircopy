import React, { Component } from 'react'

import { Toolbar, Button, IconButton } from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import SaveIcon from '@material-ui/icons/Save'
import {wrapIn} from 'prosemirror-commands'

import { addMark } from "../tei-document/commands"

const { ipcRenderer, clipboard } = window.fairCopy.electron

const versionNumber = "0.4.0"

export default class EditorToolbar extends Component {

    onDiv = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { schema } = editorView.state
        const divNodeType = schema.nodes['div']
        const cmd = wrapIn(divNodeType)
        cmd( editorView.state, editorView.dispatch )
        editorView.focus() 
    }

    onErase = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { tr, selection } = editorView.state

        let {empty, $cursor, ranges} = selection
        if (empty || $cursor) return
        for (let i = 0; i < ranges.length; i++) {
            let {$from, $to} = ranges[i]
            tr.removeMark($from.pos, $to.pos)
        }
        editorView.dispatch(tr)
        editorView.focus()
    }

    onRef = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        const markType = teiDocument.teiSchema.schema.marks.ref
        const cmd = addMark( markType )
        cmd( editorView.state, editorView.dispatch )
        editorView.focus()   
    }

    onHi = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        const markType = teiDocument.teiSchema.schema.marks.hi
        const cmd = addMark( markType )
        cmd( editorView.state, editorView.dispatch ) 
        editorView.focus()
    }

    onName = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument

        const markType = teiDocument.teiSchema.schema.marks.name
        const cmd = addMark( markType );
        cmd( editorView.state, editorView.dispatch )   
        editorView.focus()
    }

    onPb = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { state } = editorView
        const { tr, selection } = state
        const { $anchor } = selection
        const pbNode = state.schema.node('pb')
        tr.insert($anchor.pos, pbNode) 
        editorView.dispatch(tr)
        editorView.focus()
    }

    onNote = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { state } = editorView
        const { tr, selection } = state
        const { $anchor } = selection

        const subDocID = teiDocument.createSubDocument(document)
        const noteNode = state.schema.node('note', { id: '', __id__: subDocID })
        tr.insert($anchor.pos, noteNode) 
        editorView.dispatch(tr)
        ipcRenderer.send( 'createNoteEditorWindow', subDocID )
    }

    onClippy = () => {
        const html = clipboard.readHTML()
        console.log( `clippy: ${html}`) 
    }

    
    renderSaveButton() {
        const { editMode, onSave } = this.props

        if( editMode === 'note' ) {
            return (
               <IconButton 
                   className='save-button' 
                   onClick={onSave} 
                   variant='text' 
                   tooltip='Close note'>
                       <CloseIcon />
               </IconButton>
            )
       } else {
           return (
               <IconButton 
                   className='save-button' 
                   onClick={onSave} 
                   variant='text' 
                   tooltip='Save document'>
                       <SaveIcon />
               </IconButton>
            )
       }
    }

    render() {
        const { editMode } = this.props
        return (
            <div className="toolbar">
                { this.renderSaveButton() }
                { editMode === 'note' ? "" : <span style={ {float: 'right', 'marginTop': '15px'} }>{`DEV RELEASE v${versionNumber}`}</span> }
                <Toolbar className="draggable" style={{ background: '#FAFAFA', minHeight: '55px' }}>
                    <Button onClick={this.onHi}  tooltip='Add Hi Element'>hi</Button>
                    <Button onClick={this.onRef} tooltip='Add Ref Element'>ref</Button>
                    <Button onClick={this.onNote} tooltip='Add Note Element'>note</Button>
                    <Button onClick={this.onName} tooltip='Add Name Element'>name</Button>
                    { editMode === 'note' ? "" : <Button onClick={this.onPb}  tooltip='Add Pb Element'>pb</Button> }       
                    { editMode === 'note' ? "" : <Button onClick={this.onDiv} tooltip='Add Div Element'>div</Button> }
                    { !process.env.REACT_APP_DEBUG_MODE ? "" : <Button onClick={this.onClippy} >clippy</Button> }
                    <Button onClick={this.onErase} tooltip='Erase Element'><span className="fa fa-eraser"></span></Button>
                </Toolbar>
            </div>
        )
    }
}
