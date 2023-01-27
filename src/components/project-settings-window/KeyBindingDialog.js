import React, { Component } from 'react'

import { Button } from '@material-ui/core'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@material-ui/core'

import ElementMenu from "../main-window/tei-editor/ElementMenu"

const disallowedKeys = [ 'SHIFT', 'ALT', 'CTRL', 'ENTER' ]

export default class KeyBindingDialog extends Component {

    constructor(props) {
        super(props)

        const { selectedKeybinding } = this.props
        const elementType = selectedKeybinding ? selectedKeybinding.elementType : 'mark'
        const elementName = selectedKeybinding ? selectedKeybinding.elementName : null
        const title = selectedKeybinding ? "Edit Keybinding" : "New Keybinding"

        this.state = {
            title,
            chord: selectedKeybinding?.chord,
            recordingChord: false,
            elementType,
            elementName,
            elementMenuOptions: null
        }
        this.elementMenuAnchors = {}
    }

    renderChordField() {
        const { chord, recordingChord } = this.state

        const onClick = () => {
            this.setState({...this.state, recordingChord: true })
        }
        
        const onKeyUp = (event) => {
            if( recordingChord ) {
                const shiftKey = event.shiftKey ? 'SHIFT+' : ''
                const altKey = event.altKey ?  'ALT+' : ''
                const ctrlKey = event.ctrlKey ? 'CTRL+' : ''
                const key = event.key.toUpperCase()
                //if( (altKey||ctrlKey) && !disallowedKeys.includes(key) ) {
                    const nextChord = `${shiftKey}${altKey}${ctrlKey}${key}`
                    console.log(nextChord)
                    this.setState({...this.state, chord: nextChord, recordingChord: false })    
                //}
            }
        }

        const chordLabel = chord ? chord : 'Choose Key'

        return (
            <Button
                variant={recordingChord ? 'contained' : 'outlined'}
                onClick={onClick}
                onKeyUp={onKeyUp}
            >
                { chordLabel }                
            </Button>
        )
    }

    renderElementField() {
        const { elementType, elementName } = this.state

        const onClick = () => {
            this.setState({...this.state, elementMenuOptions: { menuGroup: 'mark' } })
        }

        const icon = elementType === 'mark' ? <i className="fas fa-marker"></i> : <i className="fas fa-stamp"></i>
        const elementButtonLabel = elementName ? <span>{ icon } { elementName }</span> : <span>Choose Element</span>

        return (
            <Button
                onClick={onClick}
                ref = { (el)=> { this.elementMenuAnchors.mark = el } }
            >
                { elementButtonLabel }                
            </Button>
        )
    }

    onCloseElementMenu = () => {
        this.setState({...this.state, elementMenuOptions: null })
    }

    renderElementMenu() {
        const { fairCopyConfig, teiSchema } = this.props
        const { elementMenuOptions } = this.state

        if(!elementMenuOptions) return null

        const { menus } = fairCopyConfig
        const { elements } = teiSchema
        
        const onAction = (elementID) => {
            this.setState({ ...this.state, elementName: elementID, elementMenuOptions: null })
        }

        return (
            <ElementMenu
                menus={menus}
                elements={elements}
                onClose={ () => {
                    this.setState({...this.state, elementMenuOptions: null })
                } }
                elementMenuAnchors={this.elementMenuAnchors}
                onAction={onAction}
                validAction={() => { return true }}
                onExited={() => {}}
                {...elementMenuOptions}
            ></ElementMenu>
        )
    }

    render() {      
        const { onClose, onSave } = this.props
        const { title, chord, elementType, elementName } = this.state

        const onClickSave = () => {
            onSave(chord, elementType, elementName)
        }

        return (
            <Dialog
                id="KeyBindingDialog"
                open={true}
                aria-labelledby="keybinding-title"
            >
                <DialogTitle id="keybinding-title">{ title }</DialogTitle>
                <DialogContent>
                    { this.renderElementField() }
                    { this.renderChordField() }
                </DialogContent>
                <DialogActions>
                    <Button disabled={ !chord || !elementName } variant="contained" color="primary" onClick={onClickSave}>Save</Button>
                    <Button variant="outlined" onClick={onClose}>Cancel</Button>
                </DialogActions>
                { this.renderElementMenu() }
            </Dialog>
        )
    }

}
