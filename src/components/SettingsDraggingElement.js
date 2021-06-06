import DraggingElement from './DraggingElement'
import { addElementToMenu } from '../tei-document/faircopy-config'

// const hitMargin = {
//   top: 10,
//   bottom: 10,
//   left: 10,
//   right: 10
// }

// const positionToAction = {
//   'Top': 'addAbove',
//   'Bottom': 'addBelow',
//   'Left': 'addOutside',
//   'Right': 'addInside',
//   'Center': 'replace'
// }

export default class SettingsDraggingElement extends DraggingElement {

  constructor(props) {
    super(props)

    this.initialState = {
      menuID: null,
      groupID: null,
      palettePos: null,
      ...this.baseState
    }
    this.state = this.initialState
}

hitDetection(offsetX,offsetY) {
    const { nodePos: lastNodePos, actionType: lastActionType } = this.state

    const el = document.elementFromPoint(offsetX,offsetY)

    if( !el || !el.className ) {
    return { nodePos: lastNodePos, actionType: lastActionType }
    }

    let menuID = null
    let groupID = null
    let palettePos = null

    menuID = el.getAttribute('datamenuid')
    groupID = parseInt(el.getAttribute('datamenugroupid'))
    groupID = isNaN(groupID) ? null : groupID
    palettePos = parseInt(el.getAttribute('datapalettepos'))
    palettePos = isNaN(palettePos) ? null : palettePos

    return { menuID, groupID, palettePos }
}

// clearNodeBorder(pos, doc, tr) {
//   const node = doc.nodeAt(pos)
//   const nextAttrs = { ...node.attrs, '__border__': false}
//   const $anchor = tr.doc.resolve(pos)
//   tr.setMeta('addToHistory',false)
//   changeAttributes( node, nextAttrs, $anchor, tr )
// }

// determineBorderPosition(el,x,y) {
//   const { top, bottom, left, right } = el.getBoundingClientRect()
//   let position = 'Center'

//   if( bottom-y <= hitMargin.bottom ) {
//     position = 'Bottom'
//   } 
//   else if( y-top <= hitMargin.top ) {
//     position = 'Top'
//   }
//   else if( x-left <= hitMargin.left ) {
//     position = 'Left'
//   } 
//   else if( right-x <= hitMargin.right ) {
//     position = 'Right'
//   }

//   return position
// }

onDrop = () => {
    const { fairCopyConfig, elementID, onDrop, onUpdateConfig } = this.props
    const { menuID, groupID, palettePos } = this.state

    if( palettePos !== null ) {
        const result = addElementToMenu( elementID, palettePos, groupID, menuID, fairCopyConfig)
        if( result.error ) {
            console.log(result.message)
        } else {
            onUpdateConfig( fairCopyConfig )
        }    
    }

    this.setState(this.initialState)
    onDrop()
}

}