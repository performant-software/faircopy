import React, { Component } from 'react';
import { Drawer, Button, Popper, Paper, ClickAwayListener, IconButton } from '@material-ui/core'
import { Card, CardContent, CardActions, CardHeader } from '@material-ui/core'

import Typography from '@material-ui/core/Typography'

import AttributeDialog from './AttributeDialog'
import VocabDialog from './VocabDialog'
import { changeAttribute } from "../tei-document/commands"
import { getHighlightColor, getHighlightRanges } from "../tei-document/highlighter"

import TokenField from './attribute-fields/TokenField'
import TEIDataTextField from './attribute-fields/TEIDataTextField'
import TEIDataWordField from './attribute-fields/TEIDataWordField'
import TEIEnumeratedField from './attribute-fields/TEIEnumeratedField'
import TEIDataPointerField from './attribute-fields/TEIDataPointerField'
import IDField from './attribute-fields/IDField'

export default class ParameterDrawer extends Component {

    constructor() {
        super()
        this.state = {
            attributeDialogOpen: false,
            openElementName: null,
            vocabDialogOpen: false,
            openAttrName: null,
            anchorEl: null,
            selectedAttr: null,
            errorStates: {}
        }	
    }

    getNextErrorStates(elementName, attrName, error ) {
        const { errorStates } = this.state
        const nextErrorStates = { ...errorStates }

        if( error ) {
            if( nextErrorStates[elementName] ) {
                if( !nextErrorStates[elementName].includes(attrName) ) nextErrorStates[elementName].push(attrName)
            } else {
                nextErrorStates[elementName] = [ attrName ]
            }
        } else {
            if( nextErrorStates[elementName] ) {
                nextErrorStates[elementName] = nextErrorStates[elementName].filter( a => a !== attrName )
            } 
        }

        return nextErrorStates
    }

    changeAttributeHandler = ( element, attributeKey ) => {
        return (value,error) => {
            const { teiDocument } = this.props
            const editorView = teiDocument.getActiveView()
            const { state } = editorView 
            const { $anchor } = state.selection
            let {tr} = state
    
            const elementName = element.type.name
            const nextErrorStates = this.getNextErrorStates(elementName,attributeKey,error)
            this.setState({...this.state, errorStates: nextErrorStates })

            // if there are any errors for this element, mark it in the editor
            const elementError = ( nextErrorStates[elementName] && nextErrorStates[elementName].length > 0 )
            const nextElement = changeAttribute( element, '__error__', elementError, $anchor, tr )                
            changeAttribute( nextElement, attributeKey, value, $anchor, tr )
            editorView.dispatch(tr)
        }
    }

    renderAttributeInfoPopper() {
        const {teiSchema} = this.props.teiDocument.fairCopyProject
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
            const { vocab } = this.props.teiDocument.getVocab(elementName,attrName)
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
        if( dataType === 'teidata.pointer' ) {
            const { teiDocument } = this.props
            return (
                <TEIDataPointerField
                    elementName={elementName}
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    teiDocument={teiDocument}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataPointerField>
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
        const {teiSchema} = this.props.teiDocument.fairCopyProject
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
                        <div className="attrField" key={fieldKey} >
                            { this.renderAttributeField(elementName,key,value,attrSpec,onChange) }
                            <IconButton className="attr-info-button" onClick={handleClick}>
                                <i className="fas fa-info-circle" ></i>
                            </IconButton>
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

    renderIDField(element) {
        const { teiDocument } = this.props
        const xmlID = element.attrs['xml:id'] ? element.attrs['xml:id'] : ""
        const onChange = this.changeAttributeHandler(element,'xml:id')

        return (
            <IDField
                teiDocument={teiDocument}
                value={xmlID}
                onChangeCallback={onChange}
            ></IDField>
        )
    }

    renderElement(element,count,key) {
        const { width, teiDocument } = this.props
        const { teiSchema, fairCopyConfig } = teiDocument.fairCopyProject
        const { elements } = teiSchema
        const configElements = fairCopyConfig.elements
        const name = element.type.name
        const elementSpec = elements[name]
        const {attrState} = configElements[name]
        const style = { width:width-40 }

        const openAttributeDialog = () => {
            this.setState({...this.state, openElementName: name, attributeDialogOpen: true })
        }

        const headerAction = this.renderIDField(element)

        return (
            <Card variant="outlined" className="element" key={key} style={style}>
                <CardHeader 
                    avatar={this.renderLegendBox(count)} 
                    title={name} 
                    subheader={elementSpec.desc}
                    action={headerAction}
                ></CardHeader>
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
        const { attributeDialogOpen, openElementName, vocabDialogOpen, openAttrName } = this.state

        const editorView = teiDocument.getActiveView()
        const selection = (editorView) ? editorView.state.selection : null 
        
        // create a list of the selected phrase level elements 
        let elements = []
        if( selection ) {
            if( selection.node ) {
                // don't display drawer for notes on selection
                if( selection.node.type.name !== 'note' ) {
                    elements.push( this.renderElement(selection.node,0,'attr-panel-node') )
                }
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
                    teiDocument={teiDocument}
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
