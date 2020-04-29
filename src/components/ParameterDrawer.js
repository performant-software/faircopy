import React, { Component } from 'react';
import { Drawer, Button, Popper, Paper, ClickAwayListener } from '@material-ui/core'
import { Card, CardContent, CardActions, CardHeader } from '@material-ui/core'
import { Node } from "prosemirror-model"

import Typography from '@material-ui/core/Typography'

import AttributeDialog from './AttributeDialog'
import VocabDialog from './VocabDialog'
import { changeAttribute } from "../tei-document/commands"
import { getHighlightColor, getHighlightRanges } from "../tei-document/highlighter"

import TokenField from './attribute-fields/TokenField'
import TEIDataTextField from './attribute-fields/TEIDataTextField'
import TEIDataWordField from './attribute-fields/TEIDataWordField'
import TEIEnumeratedField from './attribute-fields/TEIEnumeratedField'

export default class ParameterDrawer extends Component {

    constructor() {
        super()
        this.state = {
            attributeDialogOpen: false,
            openElementName: null,
            vocabDialogOpen: false,
            openAttrName: null,
            anchorEl: null,
            selectedAttr: null
        }	
    }

    changeAttributeHandler = ( element, attributeKey ) => {
        return (value,error) => {
            const { teiDocument } = this.props
            const { editorView } = teiDocument
            const { state } = editorView 
            const { $anchor } = state.selection
            let {tr} = state
            if( element instanceof Node && element.type.name === 'note' && attributeKey === 'id') {
                teiDocument.moveSubDocument(element.attrs['id'], value)
            }
            const nextElement = changeAttribute( element, '__error__', (error === true), $anchor, tr )                
            changeAttribute( nextElement, attributeKey, value, $anchor, tr )
            editorView.dispatch(tr)
        }
    }

    renderAttributeInfoPopper() {
        const {teiSchema} = this.props.teiDocument
        const attrSpecs = teiSchema.attrs
        const {selectedAttr, anchorEl} = this.state

        if( !anchorEl ) return null
        const attrSpec = attrSpecs[selectedAttr]
        const onClickAway = () => { this.setState({...this.state, anchorEl: null})}

        let { minOccurs, maxOccurs } = attrSpec
        minOccurs = ( minOccurs === null ) ? 1 : Number(minOccurs)
        maxOccurs = ( maxOccurs === null ) ? 1 : (maxOccurs === "unbounded" ) ? '∞' : Number(maxOccurs)
        const s = minOccurs === 1 ? '' : 's'
        let occurrance = (minOccurs === maxOccurs) ? `${minOccurs} time${s}.` : `(${minOccurs}-${maxOccurs})`
        occurrance = ( minOccurs === maxOccurs && maxOccurs === 1 ) ? '' : occurrance

        return( 
            <ClickAwayListener onClickAway={onClickAway}>
                <Popper style={{zIndex: 2000}} anchorEl={anchorEl} open={true} placement='top'>
                    <Paper className="attribute-info-popper">
                        <Typography><b>{selectedAttr}</b></Typography>
                        <Typography className="attr-description">{attrSpec.description}</Typography>
                        <Typography className="attr-data-type">{attrSpec.dataType} {occurrance}</Typography>
                    </Paper>
                </Popper>
            </ClickAwayListener>
        )
    }

    renderAttributeField(elementName,attrName,value,attrSpec,onChange) {
        const { dataType, minOccurs, maxOccurs, valListType } = attrSpec

        if( dataType === 'token') {
            return (
                <TokenField
                    attrName={attrName}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TokenField>
            )    
        }
        if( dataType === 'teidata.word' ) {
            return (
                <TEIDataWordField
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataWordField>
            )
        }
        if( dataType === 'teidata.enumerated' ) {
            const { vocab } = this.props.teiDocument.fairCopyConfig.getVocab(elementName,attrName)
            return (
                <TEIEnumeratedField
                    elementName={elementName}
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    vocab={vocab}
                    valListType={valListType}
                    value={value}                        
                    onChangeCallback={onChange}
                    vocabEditorCallback={this.openVocabEditor}
                ></TEIEnumeratedField>
            )  
        }

        // TODO for now, this is the default
        return (
            <TEIDataTextField
                attrName={attrName}
                value={value}                        
                onChangeCallback={onChange}
            ></TEIDataTextField>
        )    
        
    }

    openVocabEditor = (elementName,attrName) => {
        this.setState({
            ...this.state,
            vocabDialogOpen: true,
            openElementName: elementName,
            openAttrName: attrName
        })
    }

    renderAttributes(element,attrState) {
        const {teiSchema} = this.props.teiDocument
        const attrSpecs = teiSchema.attrs
        const elementName = element.type.name
        
        let attrFields = []

        for( const key of Object.keys(attrState) ) {
            if( attrState[key].active ) {
                const attrSpec = attrSpecs[key]
                if( !attrSpec.hidden ) {
                    const fieldKey = `attr-${key}`
                    const {attrs} = element
                    const value = attrs[key] ? attrs[key] : ""
                    const onChange = this.changeAttributeHandler(element,key)

                    const handleClick = (e) => {
                        this.setState({ ...this.state, selectedAttr: key, anchorEl: e.currentTarget })
                    }
                    attrFields.push(
                        <div className="attrTextField" key={fieldKey} >
                            { this.renderAttributeField(elementName,key,value,attrSpec,onChange) }
                            <i className="fas fa-info-circle attr-info-button" onClick={handleClick} ></i>
                        </div>
                    )    
                }    
            }
        }           

        return ( attrFields.length > 0 ? 
            <div className="attributeFields">
                {attrFields}
            </div> 
            : <Typography variant="body1">This element has no attributes.</Typography>
        )
    }

    renderLegendBox(heatmapLevel) {
        const style = {
            background: getHighlightColor(heatmapLevel)
        }

        return (
            <div style={style} className="legend-box"></div>
        )
    }

    renderElement(element,count,key) {
        const { width, teiDocument } = this.props
        const { elements } = teiDocument.teiSchema
        const configElements = teiDocument.fairCopyConfig.state.elements
        const name = element.type.name
        const elementSpec = elements[name]
        const {attrState} = configElements[name]
        const style = { width:width-40 }

        const openAttributeDialog = () => {
            this.setState({...this.state, openElementName: name, attributeDialogOpen: true })
        }

        return (
            <Card variant="outlined" className="element" key={key} style={style}>
                <CardHeader avatar={this.renderLegendBox(count)} title={name} subheader={elementSpec.desc}></CardHeader>
                <CardContent>
                    { this.renderAttributes(element,attrState) }
                </CardContent>
                <CardActions>
                    <Button onClick={openAttributeDialog}>Add/Remove Attributes</Button>
                </CardActions>
            </Card>
        )    
    }

    render() {
        const { teiDocument } = this.props
        const { editorView, fairCopyConfig } = teiDocument
        const { attributeDialogOpen, openElementName, vocabDialogOpen, openAttrName } = this.state

        const selection = (editorView) ? editorView.state.selection : null 

        // create a list of the selected phrase level elements 
        let elements = []
        if( selection ) {
            if( selection.node ) {
                elements.push( this.renderElement(selection.node,0,'attr-panel-node') )
            } else {
                const { doc } = editorView.state
                const { $anchor } = selection
                const highlightRanges = getHighlightRanges(doc,$anchor)
                let count = 0
                for( const highlightRange of highlightRanges ) {
                    elements.push( this.renderElement(highlightRange.mark,count,`attr-panel-${count++}`) )
                }     
            }
        }

        const onCloseAttributeDialog = () => {
            this.setState({...this.state, openElementName: null, attributeDialogOpen: false })
        }

        const onCloseVocabDialog = () => {
            this.setState({...this.state, openAttributeName: null, vocabDialogOpen: false })
        }

        const s = (elements.length !== 1) ? 's' : ''
        const headerMessage = (elements.length > 0) ? 
            `Element Inspector (${elements.length} element${s})` :  
            "Click on an element to view its attributes."

        return (
            <Drawer 
                id="ParameterDrawer"
                variant="persistent"
                anchor="bottom"
                open={true}            
            >
                <div className="header">
                    <Typography>{headerMessage}</Typography>
                </div>
                { elements.length > 0 ? 
                    <div className="attribute-list">
                        { elements }
                    </div>
                    : null
                }
                <AttributeDialog 
                    elementName={openElementName} 
                    teiDocument={teiDocument} 
                    open={attributeDialogOpen} 
                    onClose={onCloseAttributeDialog} 
                ></AttributeDialog>
                <VocabDialog 
                    fairCopyConfig={fairCopyConfig}
                    elementName={openElementName}
                    attrName={openAttrName}
                    open={vocabDialogOpen} 
                    onClose={onCloseVocabDialog}
                ></VocabDialog>
                { this.renderAttributeInfoPopper() }
            </Drawer>
        )
    }

}
