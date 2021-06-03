import React, { Component } from 'react'

import ElementTree from './ElementTree'
import ElementInspector from './ElementInspector'
import ElementLibrary from './ElementLibrary'
import AttributeDialog from './AttributeDialog'

export default class SchemaEditor extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedElement: null,
            attributeDialogOpen: false
        }
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig } = this.props
        const { selectedElement, attributeDialogOpen } = this.state
        const elementGroups = fairCopyConfig.menus['structure']

        const onSelect = (elementID) => {
            this.setState({...this.state, selectedElement: elementID })
        }

        const closeAttributeDialog = () => {
            this.setState({...this.state, attributeDialogOpen: false })
        }

        const openAttributeDialog = () => {
            this.setState({...this.state, attributeDialogOpen: true })
        }

        return (
            <div id="SchemaEditor">
                <div className="top">
                    <div className="top-left">
                        <ElementTree
                            teiSchema={teiSchema}
                            elementGroups={elementGroups}
                            onSelect={onSelect}
                        ></ElementTree>
                    </div>
                    <div className="top-right">
                        <ElementLibrary
                            teiSchema={teiSchema}
                        ></ElementLibrary>
                    </div>
                </div>
                <div className="bottom">
                    <ElementInspector
                        teiSchema={teiSchema}
                        elements={fairCopyConfig.elements}
                        elementID={selectedElement}
                        openAttributeDialog={openAttributeDialog}
                    ></ElementInspector>
                </div>
                <div>
                    { attributeDialogOpen && <AttributeDialog 
                        elementName={selectedElement}
                        fairCopyConfig={fairCopyConfig}
                        teiSchema={teiSchema} 
                        open={attributeDialogOpen} 
                        onUpdateConfig={onUpdateConfig}
                        onClose={closeAttributeDialog} 
                    ></AttributeDialog> }
                </div>
            </div>
        )
    }
}
