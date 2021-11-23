import React, { Component } from 'react';
import { Button, Popper, Paper, ClickAwayListener, IconButton } from '@material-ui/core'
import { Card, CardContent, CardActions, CardHeader } from '@material-ui/core'

import Typography from '@material-ui/core/Typography'
import {Node} from 'prosemirror-model'

import AttributeDialog from '../dialogs/AttributeDialog'
import VocabDialog from '../dialogs/VocabDialog'
import TokenField from './attribute-fields/TokenField'
import TEIDataTextField from './attribute-fields/TEIDataTextField'
import TEIEnumeratedField from './attribute-fields/TEIEnumeratedField'
import TEIDataPointerField from './attribute-fields/TEIDataPointerField'
import TEIDataWordLikeField from './attribute-fields/TEIDataWordLikeField'
import IDField from './attribute-fields/IDField'

import { changeAttributes } from "../../../model/commands"
import { getHighlightColor } from "../../../model/highlighter"
import { checkID } from '../../../model/attribute-validators'
import { saveConfig, addElementToSchema } from '../../../model/faircopy-config'
import { teiDataWordValidator, teiDataCountValidator, teiDataNumericValidator, teiDataProbability, teiDataTruthValue } from '../../../model/attribute-validators'

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
            selectedElement: null,
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
            const elementName = element.type.name
            const {asides} = teiDocument.fairCopyProject.teiSchema.elementGroups
            const editorView = asides.includes(elementName) ? teiDocument.editorView : teiDocument.getActiveView()
            const { state } = editorView 
            const { $anchor } = state.selection
            let {tr} = state
    
            const nextErrorStates = this.getNextErrorStates(elementName,attributeKey,error)
            this.setState({...this.state, errorStates: nextErrorStates })

            const newAttrs = { ...element.attrs }
            newAttrs[attributeKey] = value
            changeAttributes( element, newAttrs, $anchor, tr )
            editorView.dispatch(tr)
        }
    }

    renderAttributeInfoPopper() {
        const {teiSchema} = this.props.teiDocument.fairCopyProject
        const {selectedAttr, selectedElement, anchorEl} = this.state

        if( !anchorEl ) return null
        const attrSpec = teiSchema.getAttrSpec( selectedAttr, selectedElement )
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
                <TEIDataWordLikeField
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    validator={teiDataWordValidator}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataWordLikeField>
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
        if( dataType === 'teidata.numeric' ) {
            return (
                <TEIDataWordLikeField
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    validator={teiDataNumericValidator}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataWordLikeField>
            )
        }
        if( dataType === 'teidata.count' ) {
            return (
                <TEIDataWordLikeField
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    validator={teiDataCountValidator}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataWordLikeField>
            )
        }
        if( dataType === 'teidata.probability' ) {
            return (
                <TEIDataWordLikeField
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    validator={teiDataProbability}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataWordLikeField>
            )
        }
        if( dataType === 'teidata.truthValue' ) {
            return (
                <TEIDataWordLikeField
                    attrName={attrName}
                    minOccurs={minOccurs}
                    maxOccurs={maxOccurs}
                    validator={teiDataTruthValue}
                    value={value}                        
                    onChangeCallback={onChange}
                ></TEIDataWordLikeField>
            )
        }

        // fallback to treating it as text if data type isn't supported
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

    renderAttributes(element,elementID,attrState) {
        const {teiSchema} = this.props.teiDocument.fairCopyProject
        
        let attrFields = [], inactiveErrors = []

        for( const key of Object.keys(attrState) ) {
            const attrSpec = teiSchema.getAttrSpec( key, elementID )
            const {attrs} = element
            const value = attrs[key] ? attrs[key] : ""
            const active = attrState[key].active
    
            if( !attrSpec.hidden && (active || value !== "")) {
                const fieldKey = `attr-${key}`
                const onChange = this.changeAttributeHandler(element,key)

                const handleClick = (e) => {
                    this.setState({ ...this.state, selectedAttr: key, selectedElement: elementID, anchorEl: e.currentTarget })
                }
                attrFields.push(
                    <div className="attrField" key={fieldKey} >
                        { this.renderAttributeField(elementID,key,value,attrSpec,onChange) }
                        <IconButton className="attr-info-button" onClick={handleClick}>
                            <i className="fas fa-info-circle" ></i>
                        </IconButton>
                    </div>
                )
                if( !active ) {
                    inactiveErrors.push(this.renderInactiveError(key))
                }
            }    
        }           

        return ( attrFields.length > 0 ? 
            <div>
                <div className="attributeFields">
                    {attrFields}
                </div> 
                {inactiveErrors}
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
        const onChange = this.changeAttributeHandler(element,'xml:id')

        let xmlID, preExistingCondition
        if( element.attrs['xml:id'] ) {
            xmlID = element.attrs['xml:id'] 
            const relativeParentID = teiDocument.getRelativeParentID()
            // flags if the field already has an error
            preExistingCondition = checkID(xmlID,relativeParentID,teiDocument.fairCopyProject.idMap)?.errorMessage
        } else {
            xmlID = ""
            preExistingCondition = null
        } 

        return (
            <IDField
                hasID={teiDocument.hasID}
                preExistingCondition={preExistingCondition}
                value={xmlID}
                onChangeCallback={onChange}
            ></IDField>
        )
    }

    renderInactiveError(missing) {
        return (
            <Typography key={`inactive-${missing}`} className="missing-element"><i className="fas fa-exclamation-triangle fa-sm"></i><b>{missing}</b> is not in the project schema.</Typography>
        )
    }

    renderElement(element,count,key) {
        const { teiDocument } = this.props
        const { teiSchema, fairCopyConfig } = teiDocument.fairCopyProject
        const { elements } = teiSchema
        const configElements = fairCopyConfig.elements
        const name = element.type.name
        const elementSpec = elements[name]
        const elementID = name.startsWith('mark') ? name.slice('mark'.length) : name
        const {attrState} = configElements[elementID]

        const openAttributeDialog = () => {
            this.setState({...this.state, openElementName: elementID, attributeDialogOpen: true })
        }

        const onAddToSchema = () => {
            const elementMenu = teiSchema.getElementMenu(elementSpec.pmType)[0]
            addElementToSchema(elementID,elementMenu,fairCopyConfig)
            saveConfig(fairCopyConfig)
            teiDocument.refreshView()
        }

        const headerAction = (element instanceof Node) ? this.renderIDField(element) : null
        const inactiveElement = fairCopyConfig.elements[elementID] && fairCopyConfig.elements[elementID].active === false

        return (
            <Card variant="outlined" className="element" key={key} >
                <CardHeader 
                    avatar={this.renderLegendBox(count)} 
                    title={elementID} 
                    subheader={elementSpec.desc}
                    action={headerAction}
                ></CardHeader>
                <CardContent>
                    { this.renderAttributes(element,elementID,attrState) }
                    { inactiveElement && this.renderInactiveError(elementID) }
                </CardContent>
                <CardActions>
                    <Button variant="outlined" onClick={openAttributeDialog}>Add/Remove Attributes</Button>
                    { inactiveElement && <Button onClick={onAddToSchema} variant="outlined">Add element to schema</Button> }
                </CardActions>
            </Card>
        )    
    }

    renderDialogs() {
        const { teiDocument } = this.props
        const { fairCopyConfig, teiSchema } = teiDocument.fairCopyProject
        const { attributeDialogOpen, openElementName, vocabDialogOpen, openAttrName } = this.state

        const onCloseAttributeDialog = () => {
            this.setState({...this.state, openElementName: null, attributeDialogOpen: false })
        }

        const onUpdateConfig = (nextConfig) => {
            saveConfig(nextConfig)
            teiDocument.refreshView()
        }

        const onCloseVocabDialog = () => {
            this.setState({...this.state, openAttributeName: null, vocabDialogOpen: false })
        }

        return (
            <div>
                { attributeDialogOpen && <AttributeDialog 
                    elementName={openElementName} 
                    fairCopyConfig={fairCopyConfig}
                    teiSchema={teiSchema}
                    open={attributeDialogOpen} 
                    onUpdateConfig={onUpdateConfig}
                    onClose={onCloseAttributeDialog} 
                ></AttributeDialog> }
                { vocabDialogOpen && <VocabDialog 
                    teiDocument={teiDocument}
                    elementName={openElementName}
                    attrName={openAttrName}
                    open={vocabDialogOpen} 
                    onClose={onCloseVocabDialog}
                ></VocabDialog> }
                { this.renderAttributeInfoPopper() }
            </div>
        )
    }

    render() {
        const { elements, width, height } = this.props

        if( elements.length === 0 ) return null

        const elementEls = []
        let count = 0
        for( const element of elements ) {
            elementEls.push( this.renderElement(element,count,`attr-panel-${count++}`) )
        }

        const s = (elements.length !== 1) ? 's' : ''
        const headerMessage = `Element Inspector (${elements.length} element${s})`

        return (
            <div id="ParameterDrawer">
                <div role="status" className="header">
                    <Typography>{headerMessage}</Typography>
                </div>
                { elementEls.length > 0 ? 
                    <div className="attribute-list"  style={ { width, height } }>
                        { elementEls }
                    </div>
                    : null
                }
                { this.renderDialogs() }                
            </div>
        )
    }

}
