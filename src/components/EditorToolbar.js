import React, { Component } from 'react'

import { Toolbar, Button, IconButton, Select, MenuItem } from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import SaveIcon from '@material-ui/icons/Save'
import {wrapIn} from 'prosemirror-commands'

import { addMark } from "../tei-document/commands"

const { ipcRenderer, clipboard } = window.fairCopy.electron

const versionNumber = "0.4.2"
const mainWindowBackground = "#ddf8ff"
const noteWindowBackground = "#e0ddff"

export default class EditorToolbar extends Component {

    constructor() {
        super()
        this.state = {
            currentMenuGroup: 'editorial'
        }	
    }

    onDiv = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { schema } = editorView.state
        const divNodeType = schema.nodes['div']
        const cmd = wrapIn(divNodeType)
        cmd( editorView.state, editorView.dispatch )
        editorView.focus() 
    }

    onSp = () => {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { schema } = editorView.state
        const divNodeType = schema.nodes['sp']
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

    createMarkHandler(markType, editorView) {
        return () => {
            const cmd = addMark( markType )
            cmd( editorView.state, editorView.dispatch ) 
            editorView.focus()
        }    
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

    renderMarkButton(elementName) {
        const { teiDocument } = this.props
        const { editorView } = teiDocument    
        const markType = teiDocument.teiSchema.schema.marks[elementName]
        const onClick = this.createMarkHandler( markType, editorView )
        const tooltip = `Add ${elementName} Element`
        const key = `${elementName}-toolbar`

        return (
            <Button key={key} onClick={onClick} tooltip={tooltip}>{elementName}</Button>
        )
    }

    renderMenuGroups() {
        const { teiDocument } = this.props
        const { menuGroups } = teiDocument.teiSchema

        const menuItems = []
        for( const menuGroup of Object.values(menuGroups) ) {
            const key = `menugroup-${menuGroup.id}`
            menuItems.push(
                <MenuItem key={key} value={menuGroup.id}>{menuGroup.label}</MenuItem>
            )
        }

        return (
            <Select
                value={this.state.currentMenuGroup}
                onChange={(e) => { this.setState({...this.state, currentMenuGroup: e.target.value})}}
            >
                { menuItems }
            </Select>
        )
    }

    renderGroupButtons() {
        const { teiDocument } = this.props
        const { menuGroups, elements } = teiDocument.teiSchema
        const { currentMenuGroup } = this.state
        const { members } = menuGroups[currentMenuGroup]

        const groupButtons = []
        for( const elementID of members ) {
            const element = elements[elementID]
            if( element.pmType === 'mark' ) {
                groupButtons.push( this.renderMarkButton(element.name) )
            } else {
                const key = `${elementID}-toolbar`
                groupButtons.push(
                    <Button key={key} disabled>{elementID}</Button>
                )
            }
        }

        // add the eraser
        groupButtons.push(
            <Button key="eraser-toolbar" onClick={this.onErase} tooltip='Erase Element'><span className="fa fa-eraser"></span></Button>
        )
    
        return groupButtons
    }

    render() {
        const { editMode, width } = this.props

        const style = editMode === 'note' ? { width, background: noteWindowBackground } : { width, background: mainWindowBackground }

        return (
            <div id="EditorToolbar" style={style}>
                { editMode === 'note' ? <span className="note-icon fas fa-lg fa-sticky-note"></span> : "" }
                { this.renderSaveButton() }
                { editMode === 'note' ? "" : <span className="mainWindow-right">{`DEV RELEASE v${versionNumber}`}</span> }
                <Toolbar className="draggable" style={{ minHeight: '55px' }}>
                    { this.renderMenuGroups() }
                    { this.renderGroupButtons() }
                </Toolbar>
            </div>
        )
    }

    oldRender() {
        const { editMode, teiDocument, width } = this.props
        const { elements } = teiDocument.teiSchema

        const markButtons = []
        for( const element of Object.values(elements) ) {
            if( element.pmType === 'mark' ) {
                markButtons.push( this.renderMarkButton(element.name) )
            }
        }

        const style = editMode === 'note' ? { width, background: noteWindowBackground } : { width, background: mainWindowBackground }

        return (
            <div id="EditorToolbar" style={style}>
                { editMode === 'note' ? <span className="note-icon fas fa-lg fa-sticky-note"></span> : "" }
                { this.renderSaveButton() }
                { editMode === 'note' ? "" : <span className="mainWindow-right">{`DEV RELEASE v${versionNumber}`}</span> }
                <Toolbar className="draggable" style={{ minHeight: '55px' }}>
                    { this.renderMenuGroups() }
                    <Button onClick={this.onNote} tooltip='Add Note Element'>note</Button>
                    { editMode === 'note' ? "" : <Button onClick={this.onPb}  tooltip='Add Pb Element'>pb</Button> }       
                    {/* { editMode === 'note' ? "" : <Button onClick={this.onDiv} tooltip='Add Div Element'>div</Button> } */}
                    {/* { editMode === 'note' ? "" : <Button onClick={this.onSp} tooltip='Add Sp Element'>sp</Button> } */}
                    {/* { !process.env.REACT_APP_DEBUG_MODE ? "" : <Button onClick={this.onClippy} >clippy</Button> } */}
                    
                </Toolbar>
            </div>
        )
    }
}
