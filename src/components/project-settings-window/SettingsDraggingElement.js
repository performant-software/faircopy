import DraggingElement from '../common/DraggingElement'
import { addElementToMenu, removeElementFromMenu } from '../../model/faircopy-config'

const hoverOffThreshold = 150

export default class SettingsDraggingElement extends DraggingElement {

    constructor(props) {
        super(props)

        this.noTarget = {
            menuID: null,
            groupID: null,
            palettePos: null
        }

        this.initialState = {
            hoverElementID: null,
            hoverOffCounter: hoverOffThreshold,
            ...this.noTarget,
            ...this.baseState
        }
        this.state = this.initialState
    }

    hitDetection(offsetX,offsetY) {
        const { hoverElementID: prevHoverElementID, hoverOffCounter } = this.state
        const { onHover } = this.props
        const el = document.elementFromPoint(offsetX,offsetY)
        const dropZone = findDropZone(el)
        if( !dropZone ) {
            if( prevHoverElementID ) {
                if( hoverOffCounter <= 0 ) { 
                    onHover(null)
                    return { ...this.noTarget, hoverElementID: null, hoverOffCounter: hoverOffThreshold }    
                } else {
                    // document.elementFromPoint() bounces between returning the top and bottom of the DOM tree, 
                    // so wait for the threshold to be reached before hovering off
                    return { hoverOffCounter: hoverOffCounter-1 }
                }
            }
        } else {
            // record information about drop zone in case element is dropped here
            const hoverElementID = dropZone.getAttribute('dataelementid')
            const menuID = dropZone.getAttribute('datamenuid')
            let groupID = parseInt(dropZone.getAttribute('datamenugroupid'))
            groupID = isNaN(groupID) ? null : groupID
            let palettePos = parseInt(dropZone.getAttribute('datapalettepos'))
            palettePos = isNaN(palettePos) ? null : palettePos
    
            if( hoverElementID !== prevHoverElementID ) onHover(hoverElementID)
            return { menuID, groupID, palettePos, hoverElementID, hoverOffCounter: hoverOffThreshold }    
        }
    }

    onDrop = () => {
        const { fairCopyConfig, elementID, originGroupID, onDrop, onHover, onUpdateConfig } = this.props
        const { menuID, groupID, palettePos } = this.state

        if( palettePos !== null ) {
            const formerPos = removeElementFromMenu( elementID, originGroupID, menuID, fairCopyConfig)
            const finalPos = (originGroupID === groupID && formerPos <= palettePos ) ? palettePos-1 : palettePos
            const result = addElementToMenu( elementID, finalPos, groupID, menuID, fairCopyConfig)
            if( result.error ) {
                console.log(result.message)
            } else {
                onUpdateConfig( fairCopyConfig )
            }    
        }

        this.setState(this.initialState)
        onDrop()
        onHover(null)
    }

}

function findDropZone(el) {
    if( !el ) return null
    if( el.className && el.className.includes('drop-zone') ) return el
    return findDropZone(el.parentNode) 
}