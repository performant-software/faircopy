import React, { Component } from 'react'
import { Button, IconButton, Tooltip } from '@material-ui/core'
import { Typography, Card, CardContent, CardActions, CardHeader } from '@material-ui/core'

export default class ElementInspector extends Component {

    renderAttribute(attr) {
        const onClick = (e) => { }

        return (
            <Button variant="outlined" className="attr" key={`attr-${attr}`} onClick={onClick}>{ attr }</Button>
        )
    }

    renderAttributes() {
        const { elementID, fairCopyConfig, teiSchema } = this.props
        const attrSpecs = teiSchema.attrs
        const { attrState } = fairCopyConfig.elements[elementID]

        const attrFields = []

        for( const attr of Object.keys(attrState) ) {
            if( attrState[attr].active ) {
                const attrSpec = attrSpecs[attr]
                if( !attrSpec.hidden ) {
                    attrFields.push( this.renderAttribute(attr))    
                }    
            }
        }

        return ( attrFields.length > 0 ? 
            <div className="attrs">
                {attrFields}
            </div> 
            : <Typography variant="body1">This element has no attributes.</Typography>
        )
    }

    render() {
        const { elementID, onMenu, teiSchema, openAttributeDialog, onRemoveElement } = this.props

        if( !elementID ) return null

        const elementSpec = teiSchema.elements[elementID]
        const headerAction = onMenu ? <Tooltip title="Remove element from group."><IconButton onClick={onRemoveElement}><i className="fas fa-trash"></i></IconButton></Tooltip> : null
 
        return (
            <Card id="ElementInspector" variant="outlined" className="element" >
                <CardHeader 
                    title={elementID} 
                    subheader={elementSpec.desc}
                    action={headerAction}
                ></CardHeader>
                <CardContent>
                    { this.renderAttributes() }
                </CardContent>
                <CardActions>
                    <Button onClick={openAttributeDialog}>Add/Remove Attributes</Button>
                </CardActions>
            </Card>
        )
    }
}