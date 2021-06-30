import React, { Component } from 'react'

import ElementTree from './ElementTree'
import ElementInspector from './ElementInspector'
import ElementLibrary from './ElementLibrary'
import AttributeDialog from '../main-window/dialogs/AttributeDialog'
import SettingsDraggingElement from './SettingsDraggingElement'

export default class SchemaEditor extends Component {

    constructor(props) {
        super(props)

        this.state = {
            selectedElement: null,
            selectedMenu: 'structure',
            attributeDialogOpen: false,
            draggingElementActive: false,
            draggedAwayElementID: null,
            hoverOverElementID: null,
            dragInfo: null
        }
    }

    onDragElement = (elementID, clientOffset, startingPoint ) => {
        const dragInfo = { elementID, clientOffset, startingPoint }
        this.setState( {...this.state, draggingElementActive: true, dragInfo })
    }

    render() {
        const { fairCopyConfig, teiSchema, onUpdateConfig } = this.props
        const { selectedElement, attributeDialogOpen, draggingElementActive, draggedAwayElementID, hoverOverElementID, dragInfo, selectedMenu } = this.state

        const onSelect = (elementID) => {
            this.setState({...this.state, selectedElement: elementID })
        }

        const onChangeMenu = (e,nextMenu) => {
            this.setState({...this.state, selectedMenu: nextMenu })
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
                            fairCopyConfig={fairCopyConfig}
                            selectedMenu={selectedMenu}
                            draggedAwayElementID={draggedAwayElementID}
                            hoverOverElementID={hoverOverElementID}
                            onSelect={onSelect}
                            onDragElement={this.onDragElement}
                            onChangeMenu={onChangeMenu}
                        ></ElementTree>
                    </div>
                    <div className="top-right">
                        <ElementLibrary
                            teiSchema={teiSchema}
                            selectedMenu={selectedMenu}
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
                    { draggingElementActive && <SettingsDraggingElement
                        fairCopyConfig={fairCopyConfig}
                        elementID={dragInfo.elementID}
                        startingPoint={dragInfo.startingPoint}
                        clientOffset={dragInfo.clientOffset}
                        onUpdateConfig={onUpdateConfig}
                        onDraggedAway={()=>{ this.setState( { ...this.state, draggedAwayElementID: dragInfo.elementID })}}
                        onHover={(hoverOverElementID)=>{ this.setState( { ...this.state, hoverOverElementID })}}
                        onDrop={()=>{ this.setState( {...this.state, dragInfo: null, dragging: false, draggingElementActive: false, draggedAwayElementID: null} )}}
                    ></SettingsDraggingElement> }

                </div>
            </div>
        )
    }
}
