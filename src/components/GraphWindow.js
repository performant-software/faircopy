import React, { Component } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const fs = window.fairCopy.fs

export default class GraphWindow extends Component {

    constructor() {
        super()
        this.state = {
            data: null
        }	
    }

    parseODDs() {

        // STEP ONE - load simple file, locate body els, make a list of their modules
        // step two - load each module, recording the referenced modules from memberOf and content
        // step three - load the referenced modules
        // step four for a chosen element, traverse the dataset, rounding up related elements and classes
        // and puttting them into graph structure
        // lastly - render graph structure as a force directed graph

        // TODO
        // Need to look into the content and classess els of the xml files listed in the simple odd
        // What are we graphing exactly?
//         <classes>
        //     <memberOf key="att.global"/>
        //     <memberOf key="model.pPart.transcriptional"/>
        //     <memberOf key="model.linePart"/>
        //     <memberOf key="att.transcriptional"/>
        //     <memberOf key="att.placement"/>
        //     <memberOf key="att.typed"/>
        //     <memberOf key="att.dimensions"/>
    //   </classes>
//   <content>
//     <macroRef key="macro.paraContent"/>
//   </content>

        // on the one hand, you have elements, that are members of classes, which are then members of other classes
        // on the other hand you have elements that can contain certain classes or elements

        // within an element context, you have classes and elements
        // body for example
        // or p
        // show me relationship between all the classes valid in a p tag, for example
        // those classes branch out from p, and then onwards until they reach other elements on perimeter

        // we're trying to figure out how content and group in PM might relate to classes and elements in TEI


    }

    componentDidMount() {
        // const data = parseODDs()
        const data = JSON.parse(fs.readFileSync('test-docs/miserable.json', "utf8"))
        this.setState( { data } )
    }

    render() {
        const { data } = this.state
        if( !data ) return null
        return (
            <ForceGraph2D
                graphData={data}
                nodeAutoColorBy="group"
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.id;
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.color;
                    ctx.fillText(label, node.x, node.y);
                }}
            />
        )
    }
    
}
