import {Schema} from "prosemirror-model"

const nodes = {
    doc: {
        content: "block+"
    },
    text: {
        group: "inline"
    },
    ul: {
        content: "inline*",
        group: "block",
        parseDOM: [{tag: "ul"}],
        toDOM() { return ["ul", 0] }
    },
    li: {
        content: "inline*",
        group: "block",
        parseDOM: [{tag: "li"}],
        toDOM() { return ["li", 0] }
    },
}

const marks = {}

export const SimpleSchema = new Schema({ nodes, marks })