import React, { Component } from "react"
import { TableContainer, Table, TableBody } from '@material-ui/core'
import { DragDropContext, Droppable } from "react-beautiful-dnd"

export default class DragAndDropTable extends Component {
    render() {
        const { tableHead, rows, onDragEnd, caption } = this.props
        return (
            <TableContainer className="table-container">
                <Table stickyHeader size="small">
                    <caption>{caption}</caption>
                    { tableHead }
                    <TableBody component={DroppableComponent(onDragEnd)}>
                        {rows}
                    </TableBody>
                </Table>
            </TableContainer>
        )
    }
}

const DroppableComponent = (onDragEnd) => (props) => {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={'1'} direction="vertical">
                {(provided) => {
                    return (
                        <TableBody ref={provided.innerRef} {...provided.droppableProps} {...props}>
                            {props.children}
                            {provided.placeholder}
                        </TableBody>
                    )
                }}
            </Droppable>
        </DragDropContext>
    )
}