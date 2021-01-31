import React, { Component } from "react"
import { TableContainer, Table, TableBody, Paper } from '@material-ui/core'
import { DragDropContext, Droppable } from "react-beautiful-dnd"

export default class DragAndDropTable extends Component {
    render() {
        const { tableHead, rows, onDragEnd } = this.props
        return (
            <TableContainer className="table-container" component={Paper}>
                <Table stickyHeader size="small">
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