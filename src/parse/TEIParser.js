import {Schema, DOMParser as PMDOMParser } from "prosemirror-model"

const fs = window.nodeAppDependencies.fs

export default class TEIParser {

    constructor() {

        /* <lg type="stanza">
                <l>Piping down the valleys wild, </l>
                <l>Piping songs of pleasant glee, </l>
                <l>On a cloud I saw a child, </l>
                <l>And he laughing said to me: </l>
            </lg> */

        const nodes = {
            doc: {
                content: "block+"
            },
            text: {
                group: "inline"
            },
            lineGroup: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "lg"}],
                toDOM() { return ["lg", 0] }
            },
            line: {
                content: "inline*",
                group: "block",
                parseDOM: [{tag: "l"}],
                toDOM() { return ["l", 0] }
            },
        }

        const marks = {}



        this.xmlSchema = new Schema({ nodes, marks })
    }

    load( filePath ) {
        const text = fs.readFileSync(filePath, "utf8")
        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(text, "text/xml");
        const xmlDoc = PMDOMParser.fromSchema(this.xmlSchema).parse(xmlDom)

        // Convert from XML Schema to Simple Schema
        

        return null;
    }

}