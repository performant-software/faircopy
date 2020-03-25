import React, { Component } from 'react';
import { Drawer, Button, Popper, Paper, ClickAwayListener } from '@material-ui/core'
import { FormControl, InputLabel, Select, MenuItem } from '@material-ui/core'
import { Card, CardContent, CardActions, CardHeader } from '@material-ui/core'
import { Node } from "prosemirror-model"

import Typography from '@material-ui/core/Typography'

import AttributeDialog from './AttributeDialog'
import { changeAttribute } from "../tei-document/commands"
import { getHighlightColor, getHighlightRanges } from "../tei-document/highlighter"

import TokenField from './attribute-fields/TokenField'

export default class ParameterDrawer extends Component {

    constructor() {
        super()
        this.state = {
            attributeDialogOpen: false,
            openElementName: null,
            anchorEl: null,
            selectedAttr: null
        }	
    }

    changeAttributeHandler = ( element, attributeKey ) => {
        return (value) => {
            const { teiDocument } = this.props
            const { editorView } = teiDocument
            const { state } = editorView 
            const { $anchor } = state.selection
            let {tr} = state
            if( element instanceof Node && element.type.name === 'note' && attributeKey === 'id') {
                teiDocument.moveSubDocument(element.attrs['id'], value)
            }
            tr = changeAttribute( element, attributeKey, value, $anchor, tr )
            editorView.dispatch(tr)
        }
    }

    renderSelectField(element,fieldKey,key,attr,vocab) {
        const menuOptions = [ <MenuItem key={`${fieldKey}----`} value={""}>{"<none>"}</MenuItem> ]
        for( const term of vocab ) {
            menuOptions.push( <MenuItem key={`${fieldKey}-${term}`} value={term}>{term}</MenuItem>)
        }

        return (
            <FormControl id={fieldKey}>
                <InputLabel>{key}</InputLabel>
                <Select
                    className="attributeSelectField"
                    value={attr}
                    fullWidth={true}
                    onChange={this.changeAttributeHandler(element,key)}
                >
                    { menuOptions }
                </Select>
            </FormControl>
        )
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

    renderAttributeField(attrName,value,dataType,vocab,onChange) {

        // TODO pick field based on dataType

        return (
            <TokenField
                attrName={attrName}
                value={value}                        
                onChangeCallback={onChange}
            ></TokenField>
        )

        // TODO refactor this.renderSelectField(element,fieldKey,key,attr,vocab)
    }

    renderAttributes(element,attrState,vocabs) {
        const {teiSchema} = this.props.teiDocument
        const attrSpecs = teiSchema.attrs
        
        let attrFields = []

        for( const key of Object.keys(attrState) ) {
            if( attrState[key].active ) {
                const attrSpec = attrSpecs[key]
                if( !attrSpec.hidden ) {
                    const fieldKey = `attr-${key}`
                    const {attrs} = element
                    const value = attrs[key] ? attrs[key] : ""
                    const vocab = vocabs[key]
                    const onChange = this.changeAttributeHandler(element,key)

                    const handleClick = (e) => {
                        this.setState({ ...this.state, selectedAttr: key, anchorEl: e.currentTarget })
                    }
                    attrFields.push(
                        <div className="attrTextField" key={fieldKey} >
                            { this.renderAttributeField(key,value,attrSpec.dataType,vocab,onChange) }
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
        const name = element.type.name
        const elementSpec = elements[name]
        const style = { width:width-40 }

        const openAttributeDialog = () => {
            this.setState({...this.state, openElementName: name, attributeDialogOpen: true })
        }

        return (
            <Card variant="outlined" className="element" key={key} style={style}>
                <CardHeader avatar={this.renderLegendBox(count)} title={name} subheader={elementSpec.desc}></CardHeader>
                <CardContent>
                    { this.renderAttributes(element,elementSpec.attrState,elementSpec.vocabs) }
                </CardContent>
                <CardActions>
                    <Button onClick={openAttributeDialog}>Add/Remove Attributes</Button>
                </CardActions>
            </Card>
        )    
    }

    render() {
        const { teiDocument } = this.props
        const { editorView } = teiDocument
        const { attributeDialogOpen, openElementName } = this.state

        const selection = (editorView) ? editorView.state.selection : null 

        // create a list of the selected phrase level elements 
        let elements = []
        if( selection ) {
            if( selection.node ) {
                elements.push( this.renderElement(selection.node,'attr-panel-node') )
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

        const onClose = () => {
            this.setState({...this.state, openElementName: null, attributeDialogOpen: false })
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
                    onClose={onClose} 
                ></AttributeDialog>
                { this.renderAttributeInfoPopper() }
            </Drawer>
        )
    }

}
