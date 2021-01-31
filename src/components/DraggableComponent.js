import React from "react"
import { TableRow } from '@material-ui/core'
import { Draggable } from "react-beautiful-dnd"

const getItemStyle = (isDragging, draggableStyle) => ({
    // styles we need to apply on draggables
    ...draggableStyle,

    ...(isDragging && {
        background: "rgb(235,235,235)"
    })
})

export default (id, index) => (props) => {
    return (
        <Draggable draggableId={id} index={index}>
            {(provided, snapshot) => (
                <TableRow
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}

                    {...props}
                >
                    {props.children}
                </TableRow>
            )}
        </Draggable>
    )
}