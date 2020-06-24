import React, { Component } from 'react'
import { Popper, Paper, ClickAwayListener } from '@material-ui/core'
import { debounce } from "debounce";

import ProseMirrorComponent from "./ProseMirrorComponent"
// import EditorGutter from "./EditorGutter"

const resizeRefreshRate = 100

export default class NotePopup extends Component {

    constructor() {
        super()
        this.state = {
            scrollTop: 0
        }
    }

    onScroll = () => {
        if( this.el ) {
            const scrollTop = this.el.scrollTop
            this.setState({...this.state,scrollTop})    
        }
    }

    renderEditor() {
        const { teiDocument, createEditorView } = this.props
        // const { scrollTop } = this.state

        const onRef = (el) => {
            this.el = el
            if( el ) {
                el.addEventListener("scroll", debounce(this.onScroll,resizeRefreshRate))
            }
        }

        return (
            <div style={{width: 300}} ref={onRef} className='body'>
                <ProseMirrorComponent
                    createEditorView={createEditorView}
                    editorView={teiDocument.editorView}
                />                  
            </div>
        )        
    }

    render() {
        const { anchorEl, onClose } = this.props

        if( !anchorEl ) return null

        const placement = 'bottom-start'
        const elevation = 6

        return (
            <div id="NotePopup">
                 <Popper className="note-popup" placement={placement} open={true} anchorEl={anchorEl} role={undefined} disablePortal>
                    <Paper elevation={elevation}>
                        <ClickAwayListener onClickAway={onClose}>
                            {this.renderEditor()}                            
                        </ClickAwayListener>
                    </Paper>
                </Popper>
            </div>
        )
    }
}
