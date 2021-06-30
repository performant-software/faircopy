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

        if( !inDropZone(el) ) {
            if( prevHoverElementID ) {
                if( hoverOffCounter <= 0 ) { 
                    onHover(null)
                    return { ...this.noTarget, hoverElementID: null, hoverOffCounter: hoverOffThreshold }    
                } else {
                    // document.elementFromPoint() bounces between returning the top and bottom of the DOM tree, 
                    // so wait for the threshold to be reached before hovering off
                    return { ...this.noTarget, hoverElementID: prevHoverElementID, hoverOffCounter: hoverOffCounter-1 }
                }
            }
        }

        const hoverElementID = el.getAttribute('dataelementid')
        const menuID = el.getAttribute('datamenuid')
        
        let groupID = parseInt(el.getAttribute('datamenugroupid'))
        groupID = isNaN(groupID) ? null : groupID
        let palettePos = parseInt(el.getAttribute('datapalettepos'))
        palettePos = isNaN(palettePos) ? null : palettePos

        if( hoverElementID !== prevHoverElementID ) onHover(hoverElementID)
        return { menuID, groupID, palettePos, hoverElementID, hoverOffCounter: hoverOffThreshold }
    }

    onDrop = () => {
        const { fairCopyConfig, elementID, onDrop, onHover, onUpdateConfig } = this.props
        const { menuID, groupID, palettePos } = this.state

        if( palettePos !== null ) {
            removeElementFromMenu( elementID, groupID, menuID, fairCopyConfig)
            const result = addElementToMenu( elementID, palettePos, groupID, menuID, fairCopyConfig)
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

function inDropZone(el) {
    if( !el ) return false
    if( el.className && el.className.includes('drop-zone') ) return true
    return inDropZone(el.parentNode) 
}