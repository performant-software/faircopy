import React, { Component } from 'react'

import { Toolbar, Button, IconButton, Select, MenuItem } from '@material-ui/core'
import CloseIcon from '@material-ui/icons/Close'
import SaveIcon from '@material-ui/icons/Save'
import {wrapIn} from 'prosemirror-commands'

import { addMark } from "../tei-document/commands"

const fairCopy = window.fairCopy

const versionNumber = "0.4.2"
const mainWindowBackground = "#ddf8ff"
const noteWindowBackground = "#e0ddff"

export default class EditorToolbar extends Component {

    constructor() {
        super()
        this.state = {
            currentMenuGroup: 'general'
        }	
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

    createMarkHandler(markType, editorView) {
        return () => {
            const cmd = addMark( markType )
            cmd( editorView.state, editorView.dispatch ) 
            editorView.focus()
        }    
    }

    createDivHandler( divNodeType, editorView ) {
        return () => {
            const cmd = wrapIn(divNodeType)
            cmd( editorView.state, editorView.dispatch )
            editorView.focus()     
        }
    }

    createSpHandler( spNodeType, editorView ) {
        return () => {
            const cmd = wrapIn(spNodeType)
            cmd( editorView.state, editorView.dispatch )
            editorView.focus()     
        }
    }

    createPbHandler( pbNode, editorView ) {
        return () => {
            const { state } = editorView
            const { tr, selection } = state
            const { $anchor } = selection
            tr.insert($anchor.pos, pbNode) 
            editorView.dispatch(tr)
            editorView.focus()
        }
    }

    createNoteHandler( teiDocument, editorView ) {
        return () => {
            const { state } = editorView
            const { tr, selection } = state
            const { $anchor } = selection

            const subDocID = teiDocument.createSubDocument(document)
            const noteNode = state.schema.node('note', { id: '', __id__: subDocID })
            tr.insert($anchor.pos, noteNode) 
            editorView.dispatch(tr)
            fairCopy.services.ipcSend( 'createNoteEditorWindow', subDocID )
        }
    }

    onClippy = () => {
        const html = fairCopy.services.readClipBoardHTML()
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

    renderButton(elementName, onClick) {
        const tooltip = `Add ${elementName} Element`
        const key = `${elementName}-toolbar`

        if( onClick ) {
            return (
                <Button key={key} onClick={onClick} tooltip={tooltip}>{elementName}</Button>
            )    
        } else {
            return (
                <Button key={key} tooltip={tooltip} disabled>{elementName}</Button>
            )            
        }
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
        const { editorView } = teiDocument
        const { menuGroups, elements, schema } = teiDocument.teiSchema
        const { currentMenuGroup } = this.state
        const { members } = menuGroups[currentMenuGroup]

        const groupButtons = []
        for( const member of members ) {
            if( member.enabled ) {
                const elementID = member.id
                const element = elements[elementID]
                switch( elementID ) {
                    case 'div': {
                        const onClick = this.createDivHandler( schema.nodes['div'], editorView )
                        groupButtons.push( this.renderButton(element.name, onClick) )
                        break
                    }
                    case 'sp': {
                        const onClick = this.createSpHandler( schema.nodes['sp'], editorView )
                        groupButtons.push( this.renderButton(element.name, onClick) )
                        break
                    }
                    case 'pb': {
                        const onClick = this.createPbHandler( schema.nodes['pb'], editorView )
                        groupButtons.push( this.renderButton(element.name, onClick) )
                        break
                    }
                    case 'note': {
                        const onClick = this.createNoteHandler( teiDocument, editorView )
                        groupButtons.push( this.renderButton(element.name, onClick) )
                        break
                    }
                    default: {
                        const markType = schema.marks[elementID]
                        const onClick = this.createMarkHandler( markType, editorView )
                        groupButtons.push( this.renderButton(element.name, onClick) )
                        break
                    }
                }                
            } else {
                // Element is not yet implemented.
                groupButtons.push( this.renderButton(member.id,null) )
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
}
